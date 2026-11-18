import { collections, type ExpenseDoc, type UserDoc } from "@/lib/db";
import { duePeriods, periodKey, lastOccurrence } from "@/lib/recurring";
import { scopedDebts, scopedTotals } from "@/lib/balances";
import { sendSettleReminderEmail } from "@/lib/reminder-email";
import { sendPush, type PushPayload, type PushResult } from "@/lib/webpush";
import { json } from "@/lib/api-helpers";
import { formatINR, uid as newId } from "@/lib/utils";
import type { Collection } from "mongodb";
import type { PushSubscription } from "web-push";
import type { Expense, Recurring } from "@/lib/types";

interface PushMetrics {
  sent: number;
  failed: number;
  dead: number;
  pruneFailed: number;
}

function pushMetrics(): PushMetrics {
  return { sent: 0, failed: 0, dead: 0, pruneFailed: 0 };
}

/** Deliver best-effort, account for every endpoint, and retire gone endpoints. */
async function pushAndPrune(
  users: Collection<UserDoc>,
  uid: string,
  subs: PushSubscription[],
  payload: PushPayload,
  metrics: PushMetrics,
): Promise<PushResult> {
  let outcome: PushResult;
  try {
    outcome = await sendPush(subs, payload);
  } catch {
    // sendPush contains per-endpoint isolation; this guard accounts for an
    // unexpected failure before it can produce a result.
    const endpoints = new Set<string>();
    let invalid = 0;
    for (const sub of subs) {
      if (sub && typeof sub === "object" && typeof sub.endpoint === "string" && sub.endpoint) endpoints.add(sub.endpoint);
      else invalid++;
    }
    const failed = endpoints.size + invalid;
    metrics.failed += failed;
    return Object.assign([], { sent: 0, failed, dead: 0 }) as PushResult;
  }

  metrics.sent += outcome.sent;
  metrics.failed += outcome.failed;
  metrics.dead += outcome.dead;
  if (outcome.length === 0) return outcome;

  try {
    await users.updateOne(
      { _id: uid },
      // PushSubscription comes from web-push, whose Mongo update shape is not
      // expressible by the driver's strict generic for an embedded array.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { $pull: { pushSubs: { endpoint: { $in: [...outcome] } } } } as any,
    );
  } catch {
    metrics.pruneFailed++;
  }
  return outcome;
}

/**
 * The daily job (Vercel Cron). In one pass it:
 *  - repeats split expenses marked "repeat monthly";
 *  - on the 1st, nudges anyone with unsettled balances.
 * Every step is guarded by a stamp of the period it last ran for, so nothing is
 * ever counted or created twice.
 */
export async function runDaily(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) return json({ error: "unauthorized" }, 401);

  const now = new Date();
  const { users, expenses } = await collections();
  const push = pushMetrics();

  const repeated = await repeatExpenses(users, expenses, now, push);
  const settleReminders = now.getUTCDate() === 1 ? await remindToSettle(users, expenses, push) : 0;

  return json({ ok: true, repeated, settleReminders, push });
}

/* ---------- repeating split expenses ---------- */

/**
 * Split expenses flagged "repeat monthly" get a fresh copy each period, with
 * the same group, payer and split. Only the original carries the flag, so
 * copies never fan out on their own.
 */
async function repeatExpenses(
  users: Collection<UserDoc>,
  expenses: Collection<ExpenseDoc>,
  now: Date,
  push: PushMetrics,
): Promise<number> {
  const docs = await expenses.find({ recurring: { $in: ["monthly", "weekly"] } }).toArray();
  let made = 0;

  for (const e of docs) {
    const freq = e.recurring === "weekly" ? "weekly" : "monthly";
    const seed = new Date(e.date);
    const day = freq === "monthly" ? seed.getDate() : seed.getDay();
    // Fall back to the source date's period so an older expense doesn't
    // suddenly replay every period it has ever missed.
    const rule: Recurring = {
      id: e._id,
      type: "expense",
      amount: e.amount,
      category: e.category,
      freq,
      day,
      auto: true,
      lastRun: e.recurringLast ?? periodKey(freq, lastOccurrence(freq, day, seed)),
      createdAt: e.createdAt,
    };

    const due = duePeriods(rule, now);
    if (!due.length) continue;

    const copies: ExpenseDoc[] = due.map(({ date }) => {
      const copy: ExpenseDoc = {
        ...e,
        _id: newId("e_"),
        date: date.toISOString(),
        createdAt: now.toISOString(),
        recurring: "none",
      };
      delete copy.recurringLast; // only the original carries the schedule
      delete copy.accountId; // legacy "paid from account" link — no longer carried forward
      return copy;
    });

    await expenses.insertMany(copies);
    await expenses.updateOne({ _id: e._id }, { $set: { recurringLast: due[due.length - 1].key } });
    made += copies.length;

    const subs = await users
      .find({ _id: { $in: e.memberUids } }, { projection: { _id: 1, pushSubs: 1 } })
      .toArray();
    for (const u of subs) {
      await pushAndPrune(
        users,
        u._id,
        u.pushSubs ?? [],
        {
          title: "Repeat expense added",
          body: `${e.description} · ${formatINR(e.amount)} — split as before.`,
          url: e.groupId ? `/groups/${e.groupId}` : "/",
        },
        push,
      );
    }
  }
  return made;
}

/* ---------- settle-up reminders ---------- */

/**
 * Push + email anyone who still has outstanding balances, so last month's dues
 * get cleared. Balances use the same scoped math the app shows.
 */
async function remindToSettle(
  users: Collection<UserDoc>,
  expenses: Collection<ExpenseDoc>,
  push: PushMetrics,
): Promise<number> {
  const all = await users.find({}, { projection: { _id: 1, name: 1, email: 1, pushSubs: 1 } }).toArray();
  let reminded = 0;

  for (const u of all) {
    const docs = await expenses.find({ memberUids: u._id }).toArray();
    if (!docs.length) continue;

    const debts = scopedDebts(docs as unknown as Expense[], u._id);
    if (!debts.length) continue; // everyone's square

    const totals = scopedTotals(debts);
    if (totals.owedToYou < 0.5 && totals.youOwe < 0.5) continue;
    reminded++;

    const bits: string[] = [];
    if (totals.youOwe >= 0.5) bits.push(`you owe ${formatINR(totals.youOwe)}`);
    if (totals.owedToYou >= 0.5) bits.push(`${formatINR(totals.owedToYou)} owed to you`);

    await pushAndPrune(
      users,
      u._id,
      u.pushSubs ?? [],
      {
        title: "Settle up 🔔",
        body: `New month — ${bits.join(" · ")}. Clear your balances in Tally.`,
        url: "/",
      },
      push,
    );
    if (u.email) {
      await sendSettleReminderEmail(u.email, u.name, {
        owedToYou: totals.owedToYou,
        youOwe: totals.youOwe,
        people: debts.length,
      });
    }
  }
  return reminded;
}
