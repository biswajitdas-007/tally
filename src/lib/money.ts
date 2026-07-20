import type { Budget, CategoryKey, Expense, FinanceEntry, ID, Liability } from "./types";
import { monthKey, formatINR } from "./utils";
import { monthlySpend, myShare } from "./balances";

/** Sum of monthly EMIs still being paid — money that leaves you every month. */
export function monthlyEmi(liabilities: Liability[]): number {
  let sum = 0;
  for (const l of liabilities) {
    const emi = l.emi ?? 0;
    if (emi <= 0) continue;
    const remaining = l.termMonths != null ? Math.max(0, l.termMonths - (l.emisPaid ?? 0)) : Infinity;
    if (remaining > 0) sum += emi;
  }
  return sum;
}

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

export interface MoneyStatus {
  tone: "good" | "warn" | "neutral";
  message: string;
}

/**
 * A dynamic one-liner for the month, driven by the income/spend ratio. No
 * income logged is treated as exactly that — nothing came in this month — with
 * the wording shifting between empty, over-spent, tight, and comfortable.
 */
export function moneyStatus(income: number, spend: number): MoneyStatus {
  const net = income - spend;

  // Nothing came in this month.
  if (income <= 0) {
    if (spend <= 0.5) {
      return {
        tone: "neutral",
        message: "Nothing logged yet this month — add income or an expense to start tracking.",
      };
    }
    return {
      tone: "warn",
      message: `No income this month — ${formatINR(spend)} spent with nothing coming in. Add your income to see the real picture.`,
    };
  }

  // Spent more than earned.
  if (net < -0.5) {
    return {
      tone: "warn",
      message: `You've spent ${formatINR(-net)} more than you earned this month — time to ease off.`,
    };
  }

  const rate = Math.round((net / income) * 100);
  if (rate < 10) {
    return {
      tone: "warn",
      message: `Cutting it fine — almost all your income is spent, just ${formatINR(net)} left this month.`,
    };
  }
  if (rate < 30) {
    return {
      tone: "good",
      message: `Steady — you're keeping ${formatINR(net)}, about ${rate}% of what you earned.`,
    };
  }
  if (rate < 50) {
    return { tone: "good", message: `Great pace — you've saved ${rate}% of your income this month.` };
  }
  return { tone: "good", message: `Excellent — over half your income is still yours this month (${rate}% saved).` };
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

export interface BudgetView {
  monthly: number; // the total limit (0 when unset)
  spent: number; // this month's spend being compared (personal + splits)
  hasBudget: boolean;
  over: boolean;
  pct: number; // spent / monthly, 0–∞ (as %)
  categories: { category: CategoryKey; spent: number; limit: number }[];
}

export function hasBudget(budget: Budget): boolean {
  return (budget.monthly ?? 0) > 0 || Object.keys(budget.limits).length > 0;
}

/** This month's spend against the user's chosen total budget + category caps. */
export function budgetView(
  budget: Budget,
  byCat: { category: CategoryKey; amount: number }[],
  spend: number,
): BudgetView {
  const monthly = budget.monthly ?? 0;
  const catSpent = (c: CategoryKey) => byCat.find((x) => x.category === c)?.amount ?? 0;
  return {
    monthly,
    spent: spend,
    hasBudget: hasBudget(budget),
    over: monthly > 0 && spend > monthly,
    pct: monthly > 0 ? Math.round((spend / monthly) * 100) : 0,
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
