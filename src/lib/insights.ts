import type { Budget, CategoryKey, Expense, FinanceEntry, ID } from "./types";
import { monthKey, formatINR } from "./utils";
import { myShare } from "./balances";
import { monthlyMoney, spendByCategory } from "./money";
import { CATEGORIES } from "./categories";

export interface Insight {
  key: string;
  tone: "good" | "warn" | "info";
  title: string;
  detail: string;
  priority: number; // lower = more important
}

interface SpendEvent {
  date: string;
  amount: number;
  category: CategoryKey;
}

/** Everything you spent in a month — solo entries + your share of splits. */
function spendEvents(finance: FinanceEntry[], expenses: Expense[], meId: ID, mKey: string): SpendEvent[] {
  const out: SpendEvent[] = [];
  for (const f of finance) {
    if (f.type === "expense" && monthKey(f.date) === mKey) out.push({ date: f.date, amount: f.amount, category: f.category as CategoryKey });
  }
  for (const e of expenses) {
    if (e.isSettlement || monthKey(e.date) !== mKey) continue;
    const share = myShare(e, meId);
    if (share > 0) out.push({ date: e.date, amount: share, category: e.category });
  }
  return out;
}

const label = (c: CategoryKey) => CATEGORIES[c]?.label ?? "Other";
const prevMonthKey = (mKey: string) => {
  const [y, m] = mKey.split("-").map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

/** Plain-language insights & nudges for the current month. */
export function insights(finance: FinanceEntry[], expenses: Expense[], budget: Budget, meId: ID): Insight[] {
  const nowKey = monthKey(new Date().toISOString());
  const lastKey = prevMonthKey(nowKey);
  const out: Insight[] = [];

  const evThis = spendEvents(finance, expenses, meId, nowKey);
  const byThis = spendByCategory(finance, expenses, meId, nowKey);
  const byLast = spendByCategory(finance, expenses, meId, lastKey);
  const mmThis = monthlyMoney(finance, expenses, meId, nowKey);
  const total = byThis.reduce((a, c) => a + c.amount, 0);
  const lastAmt = (c: CategoryKey) => byLast.find((x) => x.category === c)?.amount ?? 0;

  // 1. Over income this month
  if (mmThis.income > 0 && mmThis.net < -0.5) {
    out.push({
      key: "over-income",
      tone: "warn",
      title: "Spending over your income",
      detail: `You've spent ${formatINR(-mmThis.net)} more than you earned this month.`,
      priority: 0,
    });
  }

  // 2. Category over its budget cap
  let worstBreach: { c: CategoryKey; over: number } | null = null;
  for (const c of byThis) {
    const cap = budget.limits[c.category];
    if (cap && c.amount > cap) {
      const over = c.amount - cap;
      if (!worstBreach || over > worstBreach.over) worstBreach = { c: c.category, over };
    }
  }
  if (worstBreach) {
    out.push({
      key: "budget-breach",
      tone: "warn",
      title: `Over budget on ${label(worstBreach.c)}`,
      detail: `${formatINR(worstBreach.over)} past your cap — ease off for the rest of the month.`,
      priority: 1,
    });
  }

  // 3. Pace vs the same point last month
  const day = new Date().getDate();
  const soFar = (mKey: string) =>
    spendEvents(finance, expenses, meId, mKey)
      .filter((e) => new Date(e.date).getDate() <= day)
      .reduce((a, e) => a + e.amount, 0);
  const thisSoFar = soFar(nowKey);
  const lastSoFar = soFar(lastKey);
  if (lastSoFar > 100) {
    const pct = Math.round(((thisSoFar - lastSoFar) / lastSoFar) * 100);
    if (pct >= 12) {
      out.push({
        key: "pace-up",
        tone: "warn",
        title: "Spending faster than last month",
        detail: `You're ${pct}% (${formatINR(thisSoFar - lastSoFar)}) ahead of this point last month.`,
        priority: 2,
      });
    } else if (pct <= -12) {
      out.push({
        key: "pace-down",
        tone: "good",
        title: "Spending less than last month",
        detail: `You're ${Math.abs(pct)}% below this point last month — nicely done.`,
        priority: 6,
      });
    }
  }

  // 4. Biggest category mover (increase)
  let mover: { c: CategoryKey; up: number } | null = null;
  for (const c of byThis) {
    const up = c.amount - lastAmt(c.category);
    if (up > 0 && (!mover || up > mover.up)) mover = { c: c.category, up };
  }
  if (mover && mover.up > 500) {
    out.push({
      key: "mover",
      tone: "info",
      title: `${label(mover.c)} is up this month`,
      detail: `${formatINR(mover.up)} more than last month.`,
      priority: 3,
    });
  }

  // 5. Top category
  if (byThis.length > 0 && total > 0) {
    const top = byThis[0];
    out.push({
      key: "top-cat",
      tone: "info",
      title: `${label(top.category)} is your top spend`,
      detail: `${formatINR(top.amount)} — ${Math.round((top.amount / total) * 100)}% of everything this month.`,
      priority: 4,
    });
  }

  // 6. Weekend habit
  const weekend = evThis.filter((e) => [0, 6].includes(new Date(e.date).getDay())).reduce((a, e) => a + e.amount, 0);
  if (total > 0 && weekend / total >= 0.4) {
    out.push({
      key: "weekend",
      tone: "info",
      title: "Weekends are your spendiest",
      detail: `${Math.round((weekend / total) * 100)}% of your spending (${formatINR(weekend)}) lands on weekends.`,
      priority: 5,
    });
  }

  // 7. Savings win
  if (mmThis.income > 0 && mmThis.net > 0.5) {
    out.push({
      key: "saved",
      tone: "good",
      title: `You've kept ${formatINR(mmThis.net)} this month`,
      detail: `That's ${Math.round((mmThis.net / mmThis.income) * 100)}% of your income saved so far.`,
      priority: 7,
    });
  }

  return out.sort((a, b) => a.priority - b.priority).slice(0, 5);
}
