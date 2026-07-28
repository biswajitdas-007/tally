import type { Account } from "./types";

/** How long a confirmed balance stays trustworthy before we ask again. */
export const RECONCILE_DAYS = 30;
/** Ignore drift smaller than this — rounding, not a real gap. */
export const DRIFT_EPSILON = 1;

const DAY = 86400000;

export const daysSince = (iso: string | undefined, now = new Date()): number | null =>
  iso ? Math.floor((now.getTime() - new Date(iso).getTime()) / DAY) : null;

/**
 * Whether an account's balance is due a check. Investments are left out —
 * their value moves on its own, so "is this still right?" is the wrong
 * question to keep asking.
 */
export function needsCheck(a: Account, now = new Date()): boolean {
  if (a.kind === "investment") return false;
  const d = daysSince(a.reconciledAt, now);
  return d === null || d >= RECONCILE_DAYS;
}

export interface StaleAccount {
  account: Account;
  /** Days since it was last confirmed, or null if it never has been. */
  days: number | null;
}

/** Accounts due a check, the longest-neglected first. */
export function staleAccounts(accounts: Account[], now = new Date()): StaleAccount[] {
  return accounts
    .filter((a) => needsCheck(a, now))
    .map((a) => ({ account: a, days: daysSince(a.reconciledAt, now) }))
    .sort((x, y) => (y.days ?? Infinity) - (x.days ?? Infinity));
}

/**
 * Apply a confirmed balance. Live balance is the stored baseline plus
 * everything logged against the account, so to make the live figure read
 * `actual` we shift the baseline by the difference — the logged history is
 * left untouched.
 */
export function reconciled(a: Account, actual: number, shown: number, now = new Date()): Account {
  const drift = actual - shown;
  return {
    ...a,
    balance: Math.round((a.balance + drift) * 100) / 100,
    reconciledAt: now.toISOString(),
  };
}

/** Just mark it confirmed, when the figure was already right. */
export const confirmed = (a: Account, now = new Date()): Account => ({ ...a, reconciledAt: now.toISOString() });

/** "3 weeks ago" / "never checked" — how we describe the last confirmation. */
export function lastCheckedLabel(days: number | null): string {
  if (days === null) return "never checked";
  if (days <= 0) return "checked today";
  if (days === 1) return "checked yesterday";
  if (days < 14) return `checked ${days} days ago`;
  if (days < 60) return `checked ${Math.round(days / 7)} weeks ago`;
  return `checked ${Math.round(days / 30)} months ago`;
}
