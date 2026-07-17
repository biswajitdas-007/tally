import type { CategoryKey, Expense, FinanceEntry, ID } from "./types";
import { monthKey } from "./utils";
import { monthlySpend, myShare } from "./balances";

/**
 * Tally Money combines two sources for your monthly picture:
 *  - personal entries you log here (income + solo expenses), and
 *  - your *share* of split expenses, pulled straight from the ledgers.
 * Settlements are excluded — they settle debt for spending already counted.
 */

export interface MonthlyMoney {
  income: number;
  personalSpend: number; // solo expenses you logged in Money
  splitSpend: number; // your share of split expenses that month
  spend: number; // personalSpend + splitSpend
  net: number; // income − spend
}

export function monthlyMoney(finance: FinanceEntry[], expenses: Expense[], meId: ID, mKey: string): MonthlyMoney {
  let income = 0;
  let personalSpend = 0;
  for (const f of finance) {
    if (monthKey(f.date) !== mKey) continue;
    if (f.type === "income") income += f.amount;
    else personalSpend += f.amount;
  }
  const splitSpend = monthlySpend(expenses, meId, mKey);
  const spend = personalSpend + splitSpend;
  return { income, personalSpend, splitSpend, spend, net: income - spend };
}

/** Months (newest → oldest) with any activity — always including the current one. */
export function activeMonths(finance: FinanceEntry[], expenses: Expense[], meId: ID): string[] {
  const set = new Set<string>();
  set.add(monthKey(new Date().toISOString()));
  for (const f of finance) set.add(monthKey(f.date));
  for (const e of expenses) if (!e.isSettlement && myShare(e, meId) > 0) set.add(monthKey(e.date));
  return [...set].sort((a, b) => (a < b ? 1 : -1));
}

/** Personal entries logged for a month, newest first. */
export function financeForMonth(finance: FinanceEntry[], mKey: string): FinanceEntry[] {
  return finance
    .filter((f) => monthKey(f.date) === mKey)
    .sort((a, b) => +new Date(b.date) - +new Date(a.date));
}

/** Spending by category for a month — personal solo expenses + your split shares. */
export function spendByCategory(
  finance: FinanceEntry[],
  expenses: Expense[],
  meId: ID,
  mKey: string,
): { category: CategoryKey; amount: number }[] {
  const totals = new Map<CategoryKey, number>();
  const add = (c: CategoryKey, v: number) => totals.set(c, (totals.get(c) ?? 0) + v);

  for (const e of expenses) {
    if (e.isSettlement || monthKey(e.date) !== mKey) continue;
    const share = myShare(e, meId);
    if (share > 0) add(e.category, share);
  }
  for (const f of finance) {
    if (f.type !== "expense" || monthKey(f.date) !== mKey) continue;
    add(f.category as CategoryKey, f.amount);
  }

  return [...totals.entries()]
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);
}

export function monthLabel(mKey: string): string {
  const [y, m] = mKey.split("-").map(Number);
  return new Date(y, m - 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}
