import type { ID, Liability } from "./types";

export type Strategy = "avalanche" | "snowball";

/** Give up rather than loop forever on a debt that never clears. */
const MAX_MONTHS = 600;

export interface PayoffDebt {
  id: ID;
  name: string;
  lender?: string;
  outstanding: number;
  emi: number;
  rate: number;
  /** Months from now until this one is cleared. */
  months: number;
  /** Interest paid on this debt over the plan. */
  interest: number;
  clearedOn: Date;
}

export interface Plan {
  strategy: Strategy;
  /** Debts in the order this strategy attacks them. */
  order: PayoffDebt[];
  /** Months until everything is clear. */
  months: number;
  totalInterest: number;
  totalPaid: number;
  debtFreeOn: Date;
  /** Debts we can't plan for, and why. */
  excluded: { id: ID; name: string; reason: "no-emi" | "never-clears" }[];
  /** True when there's at least one debt we could plan. */
  applicable: boolean;
}

export interface PayoffComparison {
  base: Plan;
  withExtra: Plan;
  extra: number;
  /** Months saved by the extra payment. */
  monthsSaved: number;
  /** Interest saved by the extra payment. */
  interestSaved: number;
}

const monthlyRate = (annualPct: number) => annualPct / 100 / 12;

function addMonths(from: Date, n: number): Date {
  return new Date(from.getFullYear(), from.getMonth() + n, from.getDate());
}

/** Sort debts into the order a strategy attacks them. */
export function prioritise<T extends { rate: number; outstanding: number }>(debts: T[], strategy: Strategy): T[] {
  return [...debts].sort((a, b) => compare(strategy, a.rate, a.outstanding, b.rate, b.outstanding));
}

/**
 * Avalanche goes by rate, snowball by size. Both fall back to the other
 * measure so the order is stable rather than arbitrary on a tie.
 */
function compare(strategy: Strategy, aRate: number, aAmt: number, bRate: number, bAmt: number): number {
  return strategy === "avalanche" ? bRate - aRate || aAmt - bAmt : aAmt - bAmt || bRate - aRate;
}

interface Sim {
  id: ID;
  name: string;
  lender?: string;
  start: number;
  bal: number;
  emi: number;
  rate: number;
  r: number;
  interest: number;
  months: number;
}

/**
 * Month-by-month simulation. Every debt gets its EMI; anything spare — the
 * extra you commit, plus the EMIs of debts already cleared — is thrown at
 * whichever debt the strategy says is next. That rollover is what makes both
 * avalanche and snowball finish faster than paying minimums forever.
 */
export function buildPlan(liabilities: Liability[], strategy: Strategy, extra = 0, now = new Date()): Plan {
  const excluded: Plan["excluded"] = [];
  const sims: Sim[] = [];

  for (const l of liabilities) {
    if (l.outstanding <= 0) continue;
    const emi = l.emi ?? 0;
    const rate = l.rate ?? 0;
    if (emi <= 0) {
      excluded.push({ id: l.id, name: l.lender || l.name, reason: "no-emi" });
      continue;
    }
    // An EMI that doesn't even cover a month's interest never clears the
    // balance — worth telling someone plainly rather than simulating forever.
    if (emi <= l.outstanding * monthlyRate(rate)) {
      excluded.push({ id: l.id, name: l.lender || l.name, reason: "never-clears" });
      continue;
    }
    sims.push({
      id: l.id,
      name: l.name,
      lender: l.lender,
      start: l.outstanding,
      bal: l.outstanding,
      emi,
      rate,
      r: monthlyRate(rate),
      interest: 0,
      months: 0,
    });
  }

  let month = 0;
  let totalInterest = 0;

  while (sims.some((s) => s.bal > 0.005) && month < MAX_MONTHS) {
    month++;
    let pool = extra;

    // Minimums first — and bank any EMI (or part of one) that isn't needed.
    for (const s of sims) {
      if (s.bal <= 0.005) {
        pool += s.emi; // this debt is gone; its EMI rolls into the attack
        continue;
      }
      const interest = s.bal * s.r;
      s.bal += interest;
      s.interest += interest;
      totalInterest += interest;

      const pay = Math.min(s.emi, s.bal);
      s.bal -= pay;
      if (pay < s.emi) pool += s.emi - pay; // final part-payment frees the rest
      if (s.bal <= 0.005) s.months = month;
    }

    // Then throw everything spare at the priority debt. Snowball targets the
    // balance as it stands now, not what it started at.
    const live = sims.filter((x) => x.bal > 0.005).sort((a, b) => compare(strategy, a.rate, a.bal, b.rate, b.bal));
    for (const s of live) {
      if (pool <= 0.005) break;
      const pay = Math.min(pool, s.bal);
      s.bal -= pay;
      pool -= pay;
      if (s.bal <= 0.005) s.months = month;
    }
  }

  // Present them in the order they actually fall, which is what someone wants
  // to work down — ties broken by the strategy's own priority.
  const order = [...sims]
    .sort((a, b) => a.months - b.months || compare(strategy, a.rate, a.start, b.rate, b.start))
    .map<PayoffDebt>((s) => ({
    id: s.id,
    name: s.name,
    lender: s.lender,
    outstanding: s.start,
    emi: s.emi,
    rate: s.rate,
    months: s.months || month,
    interest: Math.round(s.interest),
    clearedOn: addMonths(now, s.months || month),
  }));

  const principal = sims.reduce((a, s) => a + s.start, 0);
  return {
    strategy,
    order,
    months: month,
    totalInterest: Math.round(totalInterest),
    totalPaid: Math.round(principal + totalInterest),
    debtFreeOn: addMonths(now, month),
    excluded,
    applicable: sims.length > 0,
  };
}

/** What committing an extra amount each month actually buys you. */
export function comparePayoff(
  liabilities: Liability[],
  strategy: Strategy,
  extra: number,
  now = new Date(),
): PayoffComparison {
  const base = buildPlan(liabilities, strategy, 0, now);
  const withExtra = buildPlan(liabilities, strategy, Math.max(0, extra), now);
  return {
    base,
    withExtra,
    extra,
    monthsSaved: Math.max(0, base.months - withExtra.months),
    interestSaved: Math.max(0, base.totalInterest - withExtra.totalInterest),
  };
}

/** "3 years 2 months" — plain enough to read at a glance. */
export function humanMonths(n: number): string {
  if (n <= 0) return "now";
  const y = Math.floor(n / 12);
  const m = n % 12;
  const yPart = y > 0 ? `${y} ${y === 1 ? "year" : "years"}` : "";
  const mPart = m > 0 ? `${m} ${m === 1 ? "month" : "months"}` : "";
  return [yPart, mPart].filter(Boolean).join(" ") || "under a month";
}

export const STRATEGY_META: Record<Strategy, { label: string; blurb: string }> = {
  avalanche: {
    label: "Cheapest first",
    blurb: "Clears your highest interest rate first. Costs you the least overall.",
    },
  snowball: {
    label: "Smallest first",
    blurb: "Clears your smallest balance first. Slightly pricier, but you see debts disappear sooner.",
  },
};
