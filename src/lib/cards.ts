import type { Liability } from "./types";

export function cardUtilization(card: Liability): number {
  if (card.kind !== "card") return 0;
  const limit = card.limit ?? 0;
  if (limit <= 0) return 0;
  return Math.max(0, Math.min(1, card.outstanding / limit));
}

export interface CreditCardSuggestion {
  key: string;
  title: string;
  detail: string;
  tone: "good" | "info" | "warn";
}

export function creditCardSuggestions(cards: Liability[]): CreditCardSuggestion[] {
  const active = cards.filter((c) => c.kind === "card" && (c.limit ?? 0) > 0);
  if (!active.length) return [];

  const suggestions: CreditCardSuggestion[] = [];

  // Calculate overall utilization
  let totalLimit = 0;
  let totalOutstanding = 0;
  for (const c of active) {
    totalLimit += c.limit ?? 0;
    totalOutstanding += c.outstanding;
  }
  const overallPct = totalLimit > 0 ? Math.round((totalOutstanding / totalLimit) * 100) : 0;

  if (overallPct >= 80) {
    suggestions.push({
      key: "overall-utilization-critical",
      title: "Critical credit utilization",
      detail: `Your overall card utilization is ${overallPct}%. This severely impacts your credit score. Prioritize paying down your balances immediately.`,
      tone: "warn",
    });
  } else if (overallPct >= 30) {
    suggestions.push({
      key: "overall-utilization-high",
      title: "High credit utilization",
      detail: `Your overall card utilization is ${overallPct}%. Keeping it under 30% is best for your credit score.`,
      tone: "info",
    });
  } else {
    suggestions.push({
      key: "overall-utilization-good",
      title: "Healthy credit utilization",
      detail: `Your overall card utilization is ${overallPct}%. Excellent job keeping it under 30%!`,
      tone: "good",
    });
  }

  // Find outlier cards (individual cards with >= 80% utilization)
  const outliers = [...active]
    .map((c) => ({ card: c, pct: Math.round(cardUtilization(c) * 100) }))
    .filter((x) => x.pct >= 80)
    .sort((a, b) => b.pct - a.pct);

  for (const { card, pct } of outliers) {
    suggestions.push({
      key: card.id,
      title: "Maxed out card",
      detail: `${card.name} is at ${pct}% capacity. Pay it down before adding new charges.`,
      tone: "warn",
    });
  }

  return suggestions;
}
