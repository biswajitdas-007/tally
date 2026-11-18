import { USER_SPLIT_FIELDS } from "./ledger-snapshot";

/**
 * Post-split cleanup: remove the money data left in Tally's database
 * after money tracking moved to Money Ledger. Everything this is allowed to touch
 * is listed here and nowhere else, so a review of this file is a review of the
 * whole blast radius.
 */

/** Legacy money fields on `users` documents. Never split data. */
export const LEGACY_USER_FIELDS = [
  "budget",
  "accounts",
  "liabilities",
  "emergency",
  "recurrings",
  "debtPlan",
  "receiptKeys",
  "moneyMode",
] as const;

/** The legacy money collection, dropped whole. */
export const LEGACY_COLLECTION = "finance";

/** Collections that must never be written by the cleanup. */
export const PROTECTED_COLLECTIONS = ["groups", "expenses", "invites"] as const;

export interface CleanupPlan {
  unsetUserFields: Record<string, "">;
  dropCollection: typeof LEGACY_COLLECTION;
  /** Optional: strip the old "paid from account" link. It never affected balances. */
  unsetExpenseAccountId: boolean;
}

export function cleanupPlan(opts: { unsetAccountId?: boolean } = {}): CleanupPlan {
  const overlap = LEGACY_USER_FIELDS.filter((f) => (USER_SPLIT_FIELDS as readonly string[]).includes(f));
  if (overlap.length) throw new Error(`refusing to clean split fields: ${overlap.join(", ")}`);
  return {
    unsetUserFields: Object.fromEntries(LEGACY_USER_FIELDS.map((f) => [f, ""])) as Record<string, "">,
    dropCollection: LEGACY_COLLECTION,
    unsetExpenseAccountId: Boolean(opts.unsetAccountId),
  };
}

/** Filter matching users that still carry any legacy money field. */
export function legacyUserFilter(): Record<string, unknown> {
  return { $or: LEGACY_USER_FIELDS.map((f) => ({ [f]: { $exists: true } })) };
}
