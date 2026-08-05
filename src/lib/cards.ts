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
  const highest = [...active].sort((a, b) => cardUtilization(b) - cardUtilization(a))[0];
  const utilization = cardUtilization(highest);
  const pct = Math.round(utilization * 100);
  if (pct >= 80) {
    return [{ key: highest.id, title: "High card utilization", detail: `${highest.name} is at ${pct}% utilization. Pay it down before new purchases hit the limit hard.`, tone: "warn" }];
  }
  if (pct >= 30) {
    return [{ key: highest.id, title: "Keep utilization in check", detail: `${highest.name} is at ${pct}% utilization. Staying under 30% usually keeps credit healthier.`, tone: "info" }];
  }
  return [{ key: highest.id, title: "Healthy card usage", detail: `${highest.name} is at ${pct}% utilization. That's in a comfortable range.`, tone: "good" }];
}
