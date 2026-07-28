import type { Account, Budget, Emergency, Expense, FinanceEntry, ID, Liability } from "./types";
import { monthlyMoney, monthlyEmi } from "./money";
import { formatINR } from "./utils";

export function netWorth(accounts: Account[], liabilities: Liability[]) {
  const assets = accounts.reduce((a, x) => a + x.balance, 0);
  const debts = liabilities.reduce((a, x) => a + x.outstanding, 0);
  return { assets, debts, net: assets - debts };
}

/** Liquid cash: everything except investments, plus any unparked money. */
export function liquidSavings(accounts: Account[], unparked = 0): number {
  return accounts.filter((a) => a.kind !== "investment").reduce((a, x) => a + x.balance, 0) + unparked;
}

export interface EmergencyStatus {
  set: boolean;
  target: number;
  coverage: number; // the EF account's balance if linked, else total liquid
  funded: boolean;
  short: number; // how far below target (0 when funded)
  dipped: boolean; // set and coverage < target
  pct: number; // 0..1
}

/** Where the user's emergency fund stands. Never inferred — only from what they set. */
export function emergencyStatus(emergency: Emergency | null, accounts: Account[], unparked = 0): EmergencyStatus {
  const liquid = liquidSavings(accounts, unparked);
  if (!emergency || emergency.target <= 0) {
    return { set: false, target: 0, coverage: liquid, funded: false, short: 0, dipped: false, pct: 0 };
  }
  const acct = emergency.accountId ? accounts.find((a) => a.id === emergency.accountId) : undefined;
  const coverage = acct ? acct.balance : liquid;
  const funded = coverage >= emergency.target - 0.5;
  return {
    set: true,
    target: emergency.target,
    coverage,
    funded,
    short: Math.max(0, emergency.target - coverage),
    dipped: coverage < emergency.target - 0.5,
    pct: emergency.target > 0 ? Math.min(1, coverage / emergency.target) : 0,
  };
}

/** A sensible starting emergency-fund target: ~6 months of outflow, rounded. */
export function suggestedEmergency(avgOutflow: number): number {
  const raw = avgOutflow * 6;
  return raw > 0 ? Math.round(raw / 5000) * 5000 : 0;
}

function recentMonthKeys(count = 3): string[] {
  const out: string[] = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return out;
}

/** Average monthly income & spend over the last 3 months, to smooth noise. */
export function avgMonthly(finance: FinanceEntry[], expenses: Expense[], meId: ID) {
  const keys = recentMonthKeys(3);
  let income = 0;
  let spend = 0;
  for (const k of keys) {
    const m = monthlyMoney(finance, expenses, meId, k);
    income += m.income;
    spend += m.spend;
  }
  return { income: income / keys.length, spend: spend / keys.length };
}

const clampScore = (ratio: number, max: number) => Math.round(Math.max(0, Math.min(1, ratio)) * max);

export type PillarKey = "savings" | "dti" | "emergency" | "means" | "networth";

export interface Pillar {
  key: PillarKey;
  label: string;
  score: number;
  max: number;
  detail: string;
  /** Plain-language, one-line explanation of what this measures. */
  hint: string;
}

export type SetupKey = "income" | "spending" | "accounts" | "emergency";

/** One thing the score needs before it can say anything useful. */
export interface SetupStep {
  key: SetupKey;
  label: string;
  hint: string;
  done: boolean;
  /** Required steps gate the grade; the rest are just good next moves. */
  required: boolean;
}

export interface Health {
  score: number;
  grade: string;
  pillars: Pillar[];
  nudge: string;
  enough: boolean;
  /** False when there isn't enough logged (income + outflow) to be reliable. */
  confident: boolean;
  /** What's still missing before a grade means anything. */
  setup: SetupStep[];
  setupDone: number;
  setupTotal: number;
  /**
   * True once every required step is done. Until then a grade would be
   * measuring how much you've typed in, not how your money is doing — so the
   * UI shows the checklist instead.
   */
  ready: boolean;
}

const GRADES: [number, string][] = [
  [80, "A"],
  [65, "B"],
  [50, "C"],
  [35, "D"],
];
function gradeOf(score: number): string {
  for (const [t, g] of GRADES) if (score >= t) return g;
  return "F";
}

export function gradeColor(g: string): string {
  if (g === "A") return "var(--positive)";
  if (g === "B") return "#4f9e57";
  if (g === "C") return "var(--warn)";
  return "var(--negative)";
}

const NUDGES: Record<PillarKey, string> = {
  savings: "Aim to save at least 20% of your income each month.",
  dti: "Your EMIs are heavy versus income — clear high-interest debt first.",
  emergency: "Build an emergency fund covering 3–6 months of expenses.",
  means: "You're spending more than you earn — trim your biggest category.",
  networth: "Grow your savings and investments to build net worth.",
};

export function healthScore(opts: {
  finance: FinanceEntry[];
  expenses: Expense[];
  meId: ID;
  budget: Budget;
  accounts: Account[];
  liabilities: Liability[];
  emergency?: Emergency | null;
  unparked?: number;
}): Health {
  const { finance, expenses, meId, accounts, liabilities } = opts;
  const unparked = opts.unparked ?? 0;
  const avg = avgMonthly(finance, expenses, meId);
  const income = avg.income;
  const emiOut = monthlyEmi(liabilities);
  // Everything that leaves you each month: logged spend + your split share + EMIs.
  const outflow = avg.spend + emiOut;
  const hasOutflow = outflow > 0;
  const base = netWorth(accounts, liabilities);
  const nw = { ...base, net: base.net + unparked };
  const totalEmi = liabilities.reduce((a, x) => a + (x.emi ?? 0), 0);
  const hasHoldings = accounts.length > 0 || liabilities.length > 0 || unparked > 0;
  const enough = income > 0 || hasHoldings;
  // We can only gauge cashflow health with both income and some outflow logged.
  const confident = income > 0 && hasOutflow;

  const pillars: Pillar[] = [];

  // 1. Savings rate (25) — target 20% — needs real income AND outflow to mean
  // anything (avoids the misleading "100% saved" when nothing is logged).
  const rate = income > 0 ? (income - outflow) / income : 0;
  pillars.push({
    key: "savings",
    label: "Savings rate",
    max: 25,
    score: confident ? clampScore(rate / 0.2, 25) : 0,
    detail:
      income <= 0 ? "Add income" : !hasOutflow ? "Log expenses" : rate < 0 ? "Nothing saved" : `${Math.round(rate * 100)}% saved`,
    hint: "What's left after you spend",
  });

  // 2. Debt-to-income (20) — excellent ≤20%, zero at ≥36%
  const dti = income > 0 ? totalEmi / income : 0;
  pillars.push({
    key: "dti",
    label: "Debt-to-income",
    max: 20,
    score: income > 0 ? clampScore((0.36 - dti) / 0.36, 20) : totalEmi > 0 ? 8 : 20,
    detail: income > 0 ? `${Math.round(dti * 100)}% of income` : totalEmi > 0 ? "Add income" : "No EMIs",
    hint: "EMIs vs your income",
  });

  // 3. Emergency fund (20) — measured against the user's own target, not raw
  // savings. Zero when they haven't set one up (nudges them to).
  const ef = emergencyStatus(opts.emergency ?? null, accounts, unparked);
  pillars.push({
    key: "emergency",
    label: "Emergency fund",
    max: 20,
    score: !ef.set ? 0 : clampScore(ef.target > 0 ? ef.coverage / ef.target : 0, 20),
    detail: !ef.set ? "Set one up" : ef.funded ? "Fully funded" : `${formatINR(ef.coverage)} of ${formatINR(ef.target)}`,
    hint: !ef.set ? "Money kept safe for a rainy day" : ef.dipped ? "You've dipped into it" : "Your rainy-day buffer",
  });

  // 4. Living within your means (20) — income covers outflow (incl. EMIs)
  const net = income - outflow;
  pillars.push({
    key: "means",
    label: "Within your means",
    max: 20,
    score: confident ? (net >= 0 ? 20 : clampScore(1 + net / (income * 0.5), 20)) : 0,
    detail: income <= 0 ? "Add income" : !hasOutflow ? "Log expenses" : net >= 0 ? "Under income" : "Overspending",
    hint: "Income vs everything going out",
  });

  // 5. Net worth (15) — vs a year of income
  const annual = income * 12;
  pillars.push({
    key: "networth",
    label: "Net worth",
    max: 15,
    score: annual > 0 ? clampScore(nw.net / annual, 15) : nw.net > 0 ? 15 : 0,
    detail: hasHoldings ? formatINR(nw.net) : "Add accounts",
    hint: "Assets minus what you owe",
  });

  const score = pillars.reduce((a, p) => a + p.score, 0);
  const weakest = [...pillars].sort((a, b) => a.score / a.max - b.score / b.max)[0];

  // What the score still needs. Until the required ones are in, a grade would
  // reflect missing data rather than the state of someone's finances.
  const setup: SetupStep[] = [
    {
      key: "income",
      label: "Add what you earn",
      hint: "Your salary or any money coming in",
      done: income > 0,
      required: true,
    },
    {
      key: "spending",
      label: "Log some spending",
      hint: "A few expenses so we can see your cashflow",
      done: hasOutflow,
      required: true,
    },
    {
      key: "accounts",
      label: "Add your accounts",
      hint: "Bank, cash and wallets — this is your net worth",
      done: accounts.length > 0,
      required: true,
    },
    {
      key: "emergency",
      label: "Set an emergency fund",
      hint: "A target to keep safe for a rainy day",
      done: ef.set,
      required: false,
    },
  ];
  const required = setup.filter((s) => s.required);
  const ready = required.every((s) => s.done);
  const nudge = !ready
    ? "Finish setting up and we'll score your finances."
    : score >= 80
      ? "You're in great shape — keep it up."
      : NUDGES[weakest.key];

  return {
    score,
    grade: gradeOf(score),
    pillars,
    nudge,
    enough,
    confident,
    setup,
    setupDone: setup.filter((s) => s.done).length,
    setupTotal: setup.length,
    ready,
  };
}

export interface Runway {
  /** True when you're losing money each month and have net worth to deplete. */
  applicable: boolean;
  /** Whether there's enough data (logged income) to project at all. */
  confident: boolean;
  months: number; // months until net worth hits ₹0 (when applicable)
  burn: number; // monthly net loss = outflow − income
  outflow: number; // avg monthly spend + EMIs
  income: number; // avg monthly income
  net: number; // current net worth (incl. unparked)
}

/**
 * How long your net worth lasts if the last 3 months' pattern continues.
 * Outflow counts everything leaving you: logged spend + split share + EMIs.
 */
export function wealthRunway(opts: {
  finance: FinanceEntry[];
  expenses: Expense[];
  meId: ID;
  accounts: Account[];
  liabilities: Liability[];
  unparked?: number;
}): Runway {
  const { finance, expenses, meId, accounts, liabilities } = opts;
  const avg = avgMonthly(finance, expenses, meId);
  const outflow = avg.spend + monthlyEmi(liabilities);
  const income = avg.income;
  const burn = outflow - income;
  const net = netWorth(accounts, liabilities).net + (opts.unparked ?? 0);
  const confident = income > 0 || outflow > 0;
  const applicable = income > 0 && burn > 0 && net > 0;
  return { applicable, confident, months: applicable ? net / burn : 0, burn, outflow, income, net };
}
