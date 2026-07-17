import type { Account, Budget, Expense, FinanceEntry, ID, Liability } from "./types";
import { monthlyMoney, budgetIncome } from "./money";
import { formatINR } from "./utils";

export function netWorth(accounts: Account[], liabilities: Liability[]) {
  const assets = accounts.reduce((a, x) => a + x.balance, 0);
  const debts = liabilities.reduce((a, x) => a + x.outstanding, 0);
  return { assets, debts, net: assets - debts };
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
}

export interface Health {
  score: number;
  grade: string;
  pillars: Pillar[];
  nudge: string;
  enough: boolean;
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
  unparked?: number;
}): Health {
  const { finance, expenses, meId, budget, accounts, liabilities } = opts;
  const unparked = opts.unparked ?? 0;
  const avg = avgMonthly(finance, expenses, meId);
  const income = budgetIncome(budget, avg.income);
  const spend = avg.spend;
  const base = netWorth(accounts, liabilities);
  const nw = { ...base, net: base.net + unparked };
  const liquid = accounts.filter((a) => a.kind !== "investment").reduce((a, x) => a + x.balance, 0) + unparked;
  const totalEmi = liabilities.reduce((a, x) => a + (x.emi ?? 0), 0);
  const hasHoldings = accounts.length > 0 || liabilities.length > 0 || unparked > 0;
  const enough = income > 0 || hasHoldings;

  const pillars: Pillar[] = [];

  // 1. Savings rate (25) — target 20%
  const rate = income > 0 ? (income - spend) / income : 0;
  pillars.push({
    key: "savings",
    label: "Savings rate",
    max: 25,
    score: income > 0 ? clampScore(rate / 0.2, 25) : 0,
    detail: income > 0 ? `${Math.round(rate * 100)}% saved` : "Add income",
  });

  // 2. Debt-to-income (20) — excellent ≤20%, zero at ≥36%
  const dti = income > 0 ? totalEmi / income : 0;
  pillars.push({
    key: "dti",
    label: "Debt-to-income",
    max: 20,
    score: income > 0 ? clampScore((0.36 - dti) / 0.36, 20) : totalEmi > 0 ? 8 : 20,
    detail: income > 0 ? `${Math.round(dti * 100)}% of income` : totalEmi > 0 ? "Add income" : "No EMIs",
  });

  // 3. Emergency fund (20) — target 6 months of expenses
  const months = spend > 0 ? liquid / spend : liquid > 0 ? 6 : 0;
  pillars.push({
    key: "emergency",
    label: "Emergency fund",
    max: 20,
    score: clampScore(months / 6, 20),
    detail: `${months >= 0.05 ? months.toFixed(1) : "0"} months`,
  });

  // 4. Living within your means (20) — net ≥ 0
  const net = income - spend;
  pillars.push({
    key: "means",
    label: "Within your means",
    max: 20,
    score: income > 0 ? (net >= 0 ? 20 : clampScore(1 + net / (income * 0.5), 20)) : 0,
    detail: income > 0 ? (net >= 0 ? "Under income" : "Overspending") : "Add income",
  });

  // 5. Net worth (15) — vs a year of income
  const annual = income * 12;
  pillars.push({
    key: "networth",
    label: "Net worth",
    max: 15,
    score: annual > 0 ? clampScore(nw.net / annual, 15) : nw.net > 0 ? 15 : 0,
    detail: hasHoldings ? formatINR(nw.net) : "Add accounts",
  });

  const score = pillars.reduce((a, p) => a + p.score, 0);
  const weakest = [...pillars].sort((a, b) => a.score / a.max - b.score / b.max)[0];
  const nudge = score >= 80 ? "You're in great shape — keep it up." : NUDGES[weakest.key];

  return { score, grade: gradeOf(score), pillars, nudge, enough };
}
