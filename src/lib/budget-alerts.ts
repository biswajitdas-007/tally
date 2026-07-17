import { collections } from "./db";
import { sendPush } from "./webpush";
import { monthKey } from "./utils";

/** A user's total spend for a month: personal expenses + their share of splits. */
async function userMonthSpend(uid: string, mKey: string): Promise<number> {
  const { finance, expenses } = await collections();
  const fins = await finance.find({ uid, type: "expense" }).toArray();
  const exps = await expenses.find({ memberUids: uid, isSettlement: { $ne: true } }).toArray();

  let total = 0;
  for (const f of fins) if (monthKey(f.date) === mKey) total += f.amount;
  for (const e of exps) {
    if (monthKey(e.date) !== mKey) continue;
    for (const s of e.splits) if (s.personId === uid) total += s.amount;
  }
  return total;
}

/**
 * Best-effort: for each affected user who has set a budget income, push a nudge
 * if this expense just took their monthly spend *past* that income. Cheap when
 * no budget is set — it short-circuits before the spend query.
 */
export async function overspendPush(
  uids: string[],
  deltaFor: (uid: string) => number,
  dateISO: string,
): Promise<void> {
  const mKey = monthKey(dateISO);
  if (mKey !== monthKey(new Date().toISOString())) return; // only the current month

  const { users } = await collections();
  const docs = await users
    .find({ _id: { $in: uids } }, { projection: { budget: 1, pushSubs: 1 } })
    .toArray();

  for (const u of docs) {
    const income = u.budget?.income ?? 0;
    if (income <= 0) continue;
    const delta = deltaFor(u._id);
    if (delta <= 0) continue;

    const after = await userMonthSpend(u._id, mKey);
    const before = after - delta;
    if (before <= income && income < after) {
      await sendPush(u.pushSubs ?? [], {
        title: "Budget alert",
        body: "You've spent past your monthly income. Time to ease up a little 👀",
        url: "/money",
      });
    }
  }
}
