import type { CategoryKey, Expense, ID } from "./types";
import { monthKey } from "./utils";

/**
 * Model: every expense is fronted by `paidBy` and consumed via `splits`.
 * A person's net = (what they paid) − (what they consumed).
 * Positive net ⇒ they are owed money.
 */

/** Net balance between YOU and every other person (+ ⇒ they owe you). */
export function pairwiseWithMe(expenses: Expense[], meId: ID): Map<ID, number> {
  const map = new Map<ID, number>();
  const add = (id: ID, v: number) => map.set(id, (map.get(id) ?? 0) + v);

  for (const e of expenses) {
    for (const s of e.splits) {
      if (s.personId === e.paidBy) continue;
      if (e.paidBy === meId) add(s.personId, s.amount); // they owe you
      else if (s.personId === meId) add(e.paidBy, -s.amount); // you owe them
    }
  }
  return map;
}

export interface OverallSummary {
  net: number;
  owedToYou: number;
  youOwe: number;
  byPerson: { personId: ID; amount: number }[];
}

export function overallSummary(expenses: Expense[], meId: ID): OverallSummary {
  const map = pairwiseWithMe(expenses, meId);
  let owedToYou = 0;
  let youOwe = 0;
  const byPerson: { personId: ID; amount: number }[] = [];
  for (const [personId, amount] of map) {
    if (Math.abs(amount) < 0.01) continue;
    if (amount > 0) owedToYou += amount;
    else youOwe += -amount;
    byPerson.push({ personId, amount });
  }
  byPerson.sort((a, b) => b.amount - a.amount);
  return { net: owedToYou - youOwe, owedToYou, youOwe, byPerson };
}

/** Net for each member within a scope (+ ⇒ owed). */
export function memberNet(expenses: Expense[]): Map<ID, number> {
  const net = new Map<ID, number>();
  const add = (id: ID, v: number) => net.set(id, (net.get(id) ?? 0) + v);
  for (const e of expenses) {
    add(e.paidBy, e.amount);
    for (const s of e.splits) add(s.personId, -s.amount);
  }
  return net;
}

export interface Transfer {
  from: ID;
  to: ID;
  amount: number;
}

/** Greedy minimal settle-up plan for a set of net balances. */
export function simplifyDebts(net: Map<ID, number>): Transfer[] {
  const debtors: { id: ID; amt: number }[] = [];
  const creditors: { id: ID; amt: number }[] = [];
  for (const [id, v] of net) {
    if (v < -0.01) debtors.push({ id, amt: -v });
    else if (v > 0.01) creditors.push({ id, amt: v });
  }
  debtors.sort((a, b) => b.amt - a.amt);
  creditors.sort((a, b) => b.amt - a.amt);

  const transfers: Transfer[] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const pay = Math.min(debtors[i].amt, creditors[j].amt);
    transfers.push({ from: debtors[i].id, to: creditors[j].id, amount: Math.round(pay * 100) / 100 });
    debtors[i].amt -= pay;
    creditors[j].amt -= pay;
    if (debtors[i].amt < 0.01) i++;
    if (creditors[j].amt < 0.01) j++;
  }
  return transfers;
}

/** Your personal share of one expense (0 for settlements). */
export function myShare(e: Expense, meId: ID): number {
  if (e.isSettlement) return 0;
  return e.splits.filter((s) => s.personId === meId).reduce((a, s) => a + s.amount, 0);
}

export function monthlySpend(expenses: Expense[], meId: ID, mKey: string): number {
  return expenses
    .filter((e) => !e.isSettlement && monthKey(e.date) === mKey)
    .reduce((a, e) => a + myShare(e, meId), 0);
}

export function categoryBreakdown(
  expenses: Expense[],
  meId: ID,
  mKey?: string,
): { category: CategoryKey; amount: number }[] {
  const totals = new Map<CategoryKey, number>();
  for (const e of expenses) {
    if (e.isSettlement) continue;
    if (mKey && monthKey(e.date) !== mKey) continue;
    const share = myShare(e, meId);
    if (share <= 0) continue;
    totals.set(e.category, (totals.get(e.category) ?? 0) + share);
  }
  return [...totals.entries()]
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);
}

/** Your spend per month over the last `count` months (oldest → newest). */
export function monthlyTrend(
  expenses: Expense[],
  meId: ID,
  count = 6,
): { key: string; amount: number }[] {
  const now = new Date();
  const out: { key: string; amount: number }[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    out.push({ key, amount: monthlySpend(expenses, meId, key) });
  }
  return out;
}
