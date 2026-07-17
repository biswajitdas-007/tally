import type { Liability } from "./types";
import { formatINR } from "./utils";

/** Total monthly outflow toward debt — the sum of every EMI. */
export function monthlyLiability(liabilities: Liability[]): number {
  return liabilities.reduce((a, l) => a + (l.emi ?? 0), 0);
}

/** Rough interest cost per month on a balance (outstanding × rate ÷ 12). */
export function monthlyInterest(l: Liability): number {
  if (!l.rate || l.rate <= 0) return 0;
  return (l.outstanding * (l.rate / 100)) / 12;
}

export interface DebtSuggestion {
  key: string;
  tone: "warn" | "info" | "good";
  title: string;
  detail: string;
  priority: number;
}

/**
 * Real-time, data-driven debt guidance: flags an unsustainable monthly load
 * (expenses + EMIs vs income) and points at the highest-interest balance to
 * tackle — clear it outright if savings allow, otherwise prioritise it.
 */
export function debtSuggestions(opts: {
  liabilities: Liability[];
  income: number;
  spend: number;
  liquid: number;
}): DebtSuggestion[] {
  const { liabilities, income, spend, liquid } = opts;
  if (liabilities.length === 0) return [];

  const out: DebtSuggestion[] = [];
  const emiTotal = monthlyLiability(liabilities);
  const dti = income > 0 ? emiTotal / income : 0;
  const outflow = spend + emiTotal;
  const withRate = liabilities
    .filter((l) => l.rate && l.rate > 0 && l.outstanding > 0)
    .sort((a, b) => (b.rate ?? 0) - (a.rate ?? 0));

  // 1. Expenses + EMIs exceed income
  if (income > 0 && outflow > income) {
    out.push({
      key: "outflow",
      tone: "warn",
      title: "Your outgoings top your income",
      detail: `Spending + EMIs (${formatINR(outflow)}) exceed your income (${formatINR(income)}). Trim spending or prepay a loan to lighten the monthly load.`,
      priority: 0,
    });
  }

  // 2. Debt-to-income too high (36% is the usual ceiling, 50% is serious)
  if (income > 0 && dti >= 0.5) {
    out.push({
      key: "dti-high",
      tone: "warn",
      title: `EMIs eat ${Math.round(dti * 100)}% of your income`,
      detail: "Over half your income goes to loan payments. Avoid new debt and focus on clearing these.",
      priority: 1,
    });
  } else if (income > 0 && dti >= 0.36) {
    out.push({
      key: "dti-mid",
      tone: "warn",
      title: `EMIs are ${Math.round(dti * 100)}% of your income`,
      detail: "That's on the high side — keep new borrowing in check while you pay these down.",
      priority: 3,
    });
  }

  // 3. Highest-interest balance: clear it now if savings allow, else prioritise
  if (withRate.length > 0) {
    const top = withRate[0];
    const mi = monthlyInterest(top);
    const who = top.lender || top.name;
    if (liquid >= top.outstanding) {
      out.push({
        key: "clear-top",
        tone: "info",
        title: `You could clear ${who} now`,
        detail: `${formatINR(top.outstanding)} left at ${top.rate}%. Paying it from savings frees ${
          top.emi ? `${formatINR(top.emi)}/month` : "cash"
        } and stops ~${formatINR(mi)}/mo in interest.`,
        priority: 2,
      });
    } else {
      out.push({
        key: "avalanche",
        tone: "info",
        title: `Tackle ${who} first — ${top.rate}%`,
        detail: `Your priciest debt, costing ~${formatINR(mi)}/mo in interest. Send any spare cash here — even a partial prepayment cuts the interest and shortens the term.`,
        priority: 2,
      });
    }
  }

  // 4. Healthy fallback (only when they carry debt but it's light)
  if (out.length === 0 && income > 0 && dti > 0 && dti < 0.2) {
    out.push({
      key: "healthy-debt",
      tone: "good",
      title: "Your debt is well under control",
      detail: `EMIs are just ${Math.round(dti * 100)}% of your income — comfortably manageable.`,
      priority: 9,
    });
  }

  return out.sort((a, b) => a.priority - b.priority).slice(0, 4);
}
