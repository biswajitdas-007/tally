import { collections, type ExpenseDoc, type UserDoc } from "@/lib/db";
import { applyAuto, manualDue } from "@/lib/liabilities";
import { scopedDebts, scopedTotals } from "@/lib/balances";
import { sendEmiEmail } from "@/lib/emi-email";
import { sendSettleReminderEmail } from "@/lib/reminder-email";
import { sendPush } from "@/lib/webpush";
import { json } from "@/lib/api-helpers";
import { formatINR } from "@/lib/utils";
import type { Collection } from "mongodb";
import type { Expense, Liability } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Runs daily (Vercel Cron). For each user's loans:
 *  - auto-update loans whose EMI is due get one EMI counted, the balance
 *    reduced, an email receipt, and a push;
 *  - manual loans with a due, unconfirmed EMI get a push reminder.
 * `lastPaidMonth` guards against counting the same month twice.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) return json({ error: "unauthorized" }, 401);

  const now = new Date();
  const { users, expenses } = await collections();
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

  // On the 1st of the month, nudge everyone with unsettled balances.
  const settleReminders = now.getUTCDate() === 1 ? await remindToSettle(users, expenses) : 0;

  return json({ ok: true, scanned: docs.length, updated, emails, reminders, settleReminders });
}

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
