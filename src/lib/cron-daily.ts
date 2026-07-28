import { collections, type ExpenseDoc, type FinanceDoc, type UserDoc } from "@/lib/db";
import { applyAuto, manualDue } from "@/lib/liabilities";
import { duePeriods, periodKey, lastOccurrence } from "@/lib/recurring";
import { scopedDebts, scopedTotals } from "@/lib/balances";
import { sendEmiEmail } from "@/lib/emi-email";
import { sendSettleReminderEmail } from "@/lib/reminder-email";
import { sendPush } from "@/lib/webpush";
import { json } from "@/lib/api-helpers";
import { formatINR, uid as newId } from "@/lib/utils";
import type { Collection } from "mongodb";
import type { Expense, Liability, Recurring } from "@/lib/types";

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

  const emi = await runEmis(users, now);
  const recurring = await runRecurring(users, finance, now);
  const repeated = await repeatExpenses(users, expenses, now);
  const settleReminders = now.getUTCDate() === 1 ? await remindToSettle(users, expenses) : 0;

  return json({ ok: true, ...emi, ...recurring, repeated, settleReminders });
}

/* ---------- loans ---------- */

async function runEmis(users: Collection<UserDoc>, now: Date) {
  const docs = await users
    .find({ "liabilities.0": { $exists: true } }, { projection: { _id: 1, name: 1, email: 1, liabilities: 1, pushSubs: 1 } })
    .toArray();

  let updated = 0;
  let emails = 0;
  let reminders = 0;

  for (const u of docs) {
    const liabs: Liability[] = u.liabilities ?? [];
    let changed = false;
    const nextLiabs: Liability[] = [];

    for (const l of liabs) {
      if (l.autoDebit) {
        const { liability, applied } = applyAuto(l, now);
        if (applied.length > 0) {
          changed = true;
          nextLiabs.push(liability);
          if (u.email && (await sendEmiEmail(u.email, u.name, liability))) emails++;
          await sendPush(u.pushSubs ?? [], {
            title: applied.length > 1 ? `${applied.length} EMIs paid` : "EMI paid",
            body: `${liability.lender || liability.name} · ${liability.emisPaid}/${liability.termMonths} done`,
            url: "/wealth",
          });
        } else {
          nextLiabs.push(l);
        }
      } else if (manualDue(l, now)) {
        reminders++;
        await sendPush(u.pushSubs ?? [], {
          title: "EMI reminder",
          body: `Did you pay this month's ${l.lender || l.name} EMI? Confirm it in Tally.`,
          url: "/wealth",
        });
        nextLiabs.push(l);
      } else {
        nextLiabs.push(l);
      }
    }

    if (changed) {
      await users.updateOne({ _id: u._id }, { $set: { liabilities: nextLiabs } });
      updated++;
    }
  }
  return { scanned: docs.length, updated, emails, reminders };
}

/* ---------- recurring money entries ---------- */

/**
 * Add the entries each due rule owes. Rules set to `auto` create the entry
 * outright; the rest only get a nudge, and stay due until the user adds them.
 */
async function runRecurring(users: Collection<UserDoc>, finance: Collection<FinanceDoc>, now: Date) {
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
        await sendPush(u.pushSubs ?? [], {
          title: r.type === "income" ? "Income due" : "Payment due",
          body: `${r.note?.trim() || r.category} · ${formatINR(r.amount)} — add it in Tally.`,
          url: "/money",
        });
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
      await sendPush(u.pushSubs ?? [], {
        title: created.length > 1 ? `${created.length} entries added` : inc ? "Income added" : "Expense added",
        body: "Your repeats are in. Tap to review this month.",
        url: "/money",
      });
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
async function repeatExpenses(users: Collection<UserDoc>, expenses: Collection<ExpenseDoc>, now: Date): Promise<number> {
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
      await sendPush(u.pushSubs ?? [], {
        title: "Repeat expense added",
        body: `${e.description} · ${formatINR(e.amount)} — split as before.`,
        url: e.groupId ? `/groups/${e.groupId}` : "/",
      });
    }
  }
  return made;
}

/* ---------- settle-up reminders ---------- */

/**
 * Push + email anyone who still has outstanding balances, so last month's dues
 * get cleared. Balances use the same scoped math the app shows.
 */
async function remindToSettle(users: Collection<UserDoc>, expenses: Collection<ExpenseDoc>): Promise<number> {
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

    await sendPush(u.pushSubs ?? [], {
      title: "Settle up 🔔",
      body: `New month — ${bits.join(" · ")}. Clear your balances in Tally.`,
      url: "/",
    });
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
