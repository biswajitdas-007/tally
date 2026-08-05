import { collections, type ExpenseDoc, type FinanceDoc, type UserDoc } from "@/lib/db";
import { anchorLastPaidMonth, applyAuto, emiNotice, normalizeLiability } from "@/lib/liabilities";
import { duePeriods, periodKey, lastOccurrence } from "@/lib/recurring";
import { scopedDebts, scopedTotals } from "@/lib/balances";
import { sendEmiEmail } from "@/lib/emi-email";
import { sendSettleReminderEmail } from "@/lib/reminder-email";
import { sendPush, type PushPayload, type PushResult } from "@/lib/webpush";
import { json } from "@/lib/api-helpers";
import { formatINR, uid as newId } from "@/lib/utils";
import type { Collection } from "mongodb";
import type { PushSubscription } from "web-push";
import type { Expense, Liability, Recurring } from "@/lib/types";

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
 *  - counts EMIs on auto-debit loans and reminds about manual ones;
 *  - adds entries for recurring rules that have come due;
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
  const { users, expenses, finance } = await collections();
  const push = pushMetrics();

  const emi = await runEmis(users, now, push);
  const recurring = await runRecurring(users, finance, now, push);
  const repeated = await repeatExpenses(users, expenses, now, push);
  const settleReminders = now.getUTCDate() === 1 ? await remindToSettle(users, expenses, push) : 0;

  return json({ ok: true, ...emi, ...recurring, repeated, settleReminders, push });
}

/* ---------- loans ---------- */

const optimisticFields = ["lastPaidMonth", "lastEmiReminder", "emi", "termMonths", "emisPaid", "outstanding", "autoDebit", "dueDay"] as const;
type LegacyLiability = Liability & { remainingMonths?: number };

function optimisticMatch(l: Liability): Record<string, unknown> {
  const match: Record<string, unknown> = { id: l.id };
  for (const field of optimisticFields) {
    const value = l[field];
    match[field] = value === undefined ? { $exists: false } : value;
  }
  const remainingMonths = (l as LegacyLiability).remainingMonths;
  match.remainingMonths = remainingMonths === undefined ? { $exists: false } : remainingMonths;
  return match;
}

/** Claim an EMI notice before delivery so overlapping cron runs cannot resend it. */
async function claimEmiNotice(
  users: Collection<UserDoc>,
  uid: string,
  l: Liability,
  key: string,
  now: Date,
): Promise<{ claimed: boolean; anchored: boolean }> {
  const anchor = anchorLastPaidMonth(l, now);
  const anchored = l.lastPaidMonth !== anchor;
  const claimed = await users.updateOne(
    { _id: uid, liabilities: { $elemMatch: optimisticMatch(l) } },
    {
      $set: {
        "liabilities.$.lastEmiReminder": key,
        ...(anchored ? { "liabilities.$.lastPaidMonth": anchor } : {}),
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any,
  );
  return { claimed: claimed.modifiedCount === 1, anchored };
}

/**
 * A zero-success attempt is safe to retry. Restore the preceding notice cursor
 * only while our exact claim is still present, so another writer can never be
 * rolled back accidentally.
 */
async function releaseEmiNotice(users: Collection<UserDoc>, uid: string, l: Liability, key: string): Promise<boolean> {
  const filter = { _id: uid, liabilities: { $elemMatch: { id: l.id, lastEmiReminder: key } } };
  const update =
    l.lastEmiReminder === undefined
      ? { $unset: { "liabilities.$.lastEmiReminder": "" } }
      : { $set: { "liabilities.$.lastEmiReminder": l.lastEmiReminder } };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const released = await users.updateOne(filter, update as any);
  return released.modifiedCount === 1;
}

/** Apply the auto-debit cursor and balance before any receipt is delivered. */
async function persistAutoEmi(
  users: Collection<UserDoc>,
  uid: string,
  previous: Liability,
  next: Liability,
): Promise<boolean> {
  const updated = await users.updateOne(
    { _id: uid, liabilities: { $elemMatch: optimisticMatch(previous) } },
    {
      $set: {
        "liabilities.$.emisPaid": next.emisPaid,
        "liabilities.$.outstanding": next.outstanding,
        "liabilities.$.lastPaidMonth": next.lastPaidMonth,
      },
      $unset: { "liabilities.$.remainingMonths": "" },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any,
  );
  return updated.modifiedCount === 1;
}

async function runEmis(users: Collection<UserDoc>, now: Date, push: PushMetrics) {
  const docs = await users
    .find({ "liabilities.0": { $exists: true } }, { projection: { _id: 1, name: 1, email: 1, liabilities: 1, pushSubs: 1 } })
    .toArray();

  const updatedUsers = new Set<string>();
  let emails = 0;
  let reminders = 0;
  let upcomingReminders = 0;
  let conflicts = 0;
  let failures = 0;
  let emailFailures = 0;
  let reminderReleases = 0;
  let reminderReleaseFailures = 0;

  for (const u of docs) {
    const liabs: Liability[] = u.liabilities ?? [];

    for (const original of liabs) {
      try {
        let persisted = original;
        let current = normalizeLiability(original);

        if (current.autoDebit) {
          const { liability, applied } = applyAuto(current, now);
          if (applied.length > 0) {
            if (!(await persistAutoEmi(users, u._id, persisted, liability))) {
              conflicts++;
              continue;
            }

            current = liability;
            persisted = liability;
            updatedUsers.add(u._id);
            if (u.email) {
              try {
                if (await sendEmiEmail(u.email, u.name, liability)) emails++;
              } catch {
                emailFailures++;
              }
            }
            await pushAndPrune(
              users,
              u._id,
              u.pushSubs ?? [],
              {
                title: applied.length > 1 ? `${applied.length} EMIs paid` : "EMI paid",
                body: `${liability.lender || liability.name} · ${liability.emisPaid}/${liability.termMonths} done`,
                url: "/wealth",
                tag: `${liability.id}:${applied[applied.length - 1]}:paid`,
                ttl: 24 * 60 * 60,
                urgency: "normal",
              },
              push,
            );
          }
        }

        const notice = emiNotice(current, now);
        // Auto-debits are persisted first, so they can only emit the pre-due
        // event here. They never receive a manual confirmation notification.
        if (!notice || (current.autoDebit && notice.kind === "due")) continue;
        const claim = await claimEmiNotice(users, u._id, persisted, notice.key, now);
        if (!claim.claimed) {
          conflicts++;
          continue;
        }

        const label = current.lender || current.name;
        let payload: PushPayload;
        if (notice.kind === "upcoming") {
          upcomingReminders++;
          payload = {
            title: "EMI due tomorrow",
            body: current.autoDebit
              ? `${label} · ${formatINR(current.emi ?? 0)} will be marked paid automatically.`
              : notice.dueCount > 1
                ? `${label} · ${formatINR(current.emi ?? 0)} is due tomorrow, with ${notice.dueCount - 1} earlier EMI${notice.dueCount === 2 ? "" : "s"} still unconfirmed.`
                : `${label} · ${formatINR(current.emi ?? 0)}. Pay it tomorrow, then confirm it in Tally.`,
            url: "/wealth",
            tag: notice.key,
            ttl: 36 * 60 * 60,
            urgency: "high",
          };
        } else {
          reminders++;
          payload = {
            title: notice.dueCount > 1 ? "EMIs need confirmation" : "EMI reminder",
            body:
              notice.dueCount > 1
                ? `${label} has ${notice.dueCount} EMIs awaiting confirmation. Confirm them in Tally.`
                : `Did you pay this month's ${label} EMI? Confirm it in Tally.`,
            url: `/wealth?confirmEmi=${encodeURIComponent(current.id)}&period=${encodeURIComponent(notice.period)}`,
            tag: notice.key,
            ttl: 48 * 60 * 60,
            urgency: "high",
          };
        }

        const delivery = await pushAndPrune(users, u._id, u.pushSubs ?? [], payload, push);
        if (delivery.sent > 0) {
          updatedUsers.add(u._id);
          if (!current.autoDebit && notice.kind === "due" && u.email) {
            try {
              if (await sendEmiEmail(u.email, u.name, current)) emails++;
            } catch {
              emailFailures++;
            }
          }
        } else {
          let released = false;
          try {
            released = await releaseEmiNotice(users, u._id, persisted, notice.key);
          } catch {
            reminderReleaseFailures++;
            failures++;
            updatedUsers.add(u._id);
            continue;
          }
          if (released) {
            reminderReleases++;
            if (claim.anchored) updatedUsers.add(u._id);
          } else {
            // The claim changed after delivery started, so leave the newer
            // state untouched and expose the failed release in the run result.
            reminderReleaseFailures++;
            updatedUsers.add(u._id);
          }
        }
      } catch {
        // One malformed liability or transient write failure must not prevent
        // other users and loans from being processed.
        failures++;
      }
    }
  }
  return {
    scanned: docs.length,
    updated: updatedUsers.size,
    emails,
    emailFailures,
    reminders,
    upcomingReminders,
    reminderReleases,
    reminderReleaseFailures,
    emiConflicts: conflicts,
    emiFailures: failures,
  };
}

/* ---------- recurring money entries ---------- */

/**
 * Add the entries each due rule owes. Rules set to `auto` create the entry
 * outright; the rest only get a nudge, and stay due until the user adds them.
 */
async function runRecurring(
  users: Collection<UserDoc>,
  finance: Collection<FinanceDoc>,
  now: Date,
  push: PushMetrics,
) {
  const docs = await users
    .find({ "recurrings.0": { $exists: true } }, { projection: { _id: 1, recurrings: 1, pushSubs: 1 } })
    .toArray();

  let added = 0;
  let nudged = 0;

  for (const u of docs) {
    const rules: Recurring[] = u.recurrings ?? [];
    const next: Recurring[] = [];
    const created: FinanceDoc[] = [];
    let changed = false;

    for (const r of rules) {
      const due = duePeriods(r, now);
      if (!due.length) {
        next.push(r);
        continue;
      }

      if (!r.auto) {
        nudged++;
        await pushAndPrune(
          users,
          u._id,
          u.pushSubs ?? [],
          {
            title: r.type === "income" ? "Income due" : "Payment due",
            body: `${r.note?.trim() || r.category} · ${formatINR(r.amount)} — add it in Tally.`,
            url: "/money",
          },
          push,
        );
        next.push(r);
        continue;
      }

      for (const { date } of due) {
        created.push({
          _id: newId("f_"),
          uid: u._id,
          type: r.type,
          amount: r.amount,
          category: r.category,
          date: date.toISOString(),
          note: r.note,
          createdAt: now.toISOString(),
          accountId: r.accountId,
          recurringId: r.id,
        });
      }
      changed = true;
      next.push({ ...r, lastRun: due[due.length - 1].key });
    }

    if (created.length) {
      await finance.insertMany(created);
      added += created.length;
      const inc = created.filter((c) => c.type === "income").length;
      await pushAndPrune(
        users,
        u._id,
        u.pushSubs ?? [],
        {
          title: created.length > 1 ? `${created.length} entries added` : inc ? "Income added" : "Expense added",
          body: "Your repeats are in. Tap to review this month.",
          url: "/money",
        },
        push,
      );
    }
    if (changed) await users.updateOne({ _id: u._id }, { $set: { recurrings: next } });
  }
  return { recurringAdded: added, recurringNudged: nudged };
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
