import type { Budget, CategoryKey, Expense, FinanceEntry, ID } from "./types";
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
    if (f.transfer || monthKey(f.date) !== mKey) continue;
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
    .filter((f) => !f.transfer && monthKey(f.date) === mKey)
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
    if (f.type !== "expense" || f.transfer || monthKey(f.date) !== mKey) continue;
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

/* ---------- budgets (50/30/20 + per-category caps) ---------- */

/** Which half of the 50/30/20 split each spend category falls under. */
export const CATEGORY_BUCKET: Record<CategoryKey, "needs" | "wants"> = {
  rent: "needs",
  bills: "needs",
  health: "needs",
  food: "needs",
  travel: "needs",
  shopping: "wants",
  fun: "wants",
  other: "wants",
};

export interface BudgetBar {
  spent: number;
  limit: number;
}

export interface BudgetView {
  income: number;
  hasBudget: boolean;
  needs: BudgetBar;
  wants: BudgetBar;
  savings: { actual: number; target: number };
  overIncome: boolean;
  categories: { category: CategoryKey; spent: number; limit: number }[];
}

/** The income the 50/30/20 split rests on: your set budget income, else what you logged. */
export function budgetIncome(budget: Budget, monthIncome: number): number {
  return budget.income && budget.income > 0 ? budget.income : monthIncome;
}

export function hasBudget(budget: Budget): boolean {
  return (budget.income ?? 0) > 0 || Object.keys(budget.limits).length > 0;
}

export function budgetView(
  budget: Budget,
  byCat: { category: CategoryKey; amount: number }[],
  income: number,
): BudgetView {
  const spentOf = (bucket: "needs" | "wants") =>
    byCat.filter((c) => CATEGORY_BUCKET[c.category] === bucket).reduce((a, c) => a + c.amount, 0);
  const needsSpent = spentOf("needs");
  const wantsSpent = spentOf("wants");
  const spend = needsSpent + wantsSpent;
  const catSpent = (c: CategoryKey) => byCat.find((x) => x.category === c)?.amount ?? 0;

  return {
    income,
    hasBudget: hasBudget(budget),
    needs: { spent: needsSpent, limit: income * 0.5 },
    wants: { spent: wantsSpent, limit: income * 0.3 },
    savings: { actual: income - spend, target: income * 0.2 },
    overIncome: income > 0 && spend > income,
    categories: (Object.entries(budget.limits) as [CategoryKey, number][])
      .filter(([, limit]) => limit > 0)
      .map(([category, limit]) => ({ category, spent: catSpent(category), limit }))
      .sort((a, b) => b.spent / b.limit - a.spent / a.limit),
  };
}

/** A warning if a spend takes `before → after` across the 80% or 100% mark of `limit`. */
export function crossingWarning(before: number, after: number, limit: number, label: string): string | null {
  if (limit <= 0) return null;
  if (before < limit && after >= limit) return `You're over your ${label} budget.`;
  if (before < limit * 0.8 && after >= limit * 0.8) {
    return `You're at ${Math.round((after / limit) * 100)}% of your ${label} budget.`;
  }
  return null;
}
