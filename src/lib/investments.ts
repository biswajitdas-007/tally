import type { Account } from "./types";

/** Just the investment-kind accounts. */
export function investments(accounts: Account[]): Account[] {
  return accounts.filter((a) => a.kind === "investment");
}

export interface InvestmentTotals {
  count: number;
  value: number; // current worth of everything invested
  invested: number; // cost basis, but only for holdings where it's known
  gain: number; // value − invested, over the known-cost holdings only
  gainPct: number; // gain as a share of that known cost
  hasCost: boolean; // at least one holding has a cost basis to compare against
}

/**
 * Portfolio totals. Returns are computed only over holdings you gave a cost
 * basis for, so a holding with no "invested" amount never distorts the gain.
 */
export function investmentTotals(accounts: Account[]): InvestmentTotals {
  const list = investments(accounts);
  let value = 0;
  let invested = 0;
  let valueOfKnown = 0;
  let hasCost = false;
  for (const a of list) {
    value += a.balance;
    if (typeof a.invested === "number" && a.invested > 0) {
      invested += a.invested;
      valueOfKnown += a.balance;
      hasCost = true;
    }
  }
  const gain = valueOfKnown - invested;
  return {
    count: list.length,
    value,
    invested,
    gain,
    gainPct: invested > 0 ? gain / invested : 0,
    hasCost,
  };
}

/** Gain on a single holding, when it has a cost basis. */
export function holdingGain(a: Account): { gain: number; pct: number } | null {
  if (typeof a.invested !== "number" || a.invested <= 0) return null;
  const gain = a.balance - a.invested;
  return { gain, pct: gain / a.invested };
}
