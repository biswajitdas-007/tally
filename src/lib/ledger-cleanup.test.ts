import { describe, expect, it } from "vitest";
import { cleanupPlan, LEGACY_USER_FIELDS, legacyUserFilter, PROTECTED_COLLECTIONS } from "./ledger-cleanup";
import { USER_SPLIT_FIELDS } from "./ledger-snapshot";

describe("post-split cleanup plan", () => {
  it("only ever unsets the legacy money fields", () => {
    const plan = cleanupPlan();
    expect(Object.keys(plan.unsetUserFields).sort()).toEqual([...LEGACY_USER_FIELDS].sort());
    for (const f of USER_SPLIT_FIELDS) expect(plan.unsetUserFields).not.toHaveProperty(f);
    for (const f of ["contacts", "removedFriends", "upiId", "pushSubs", "name", "email"]) {
      expect(plan.unsetUserFields).not.toHaveProperty(f);
    }
  });

  it("drops only the legacy money collection", () => {
    const plan = cleanupPlan();
    expect(plan.dropCollection).toBe("finance");
    expect(PROTECTED_COLLECTIONS).not.toContain(plan.dropCollection);
  });

  it("leaves expenses alone unless the account link removal is asked for", () => {
    expect(cleanupPlan().unsetExpenseAccountId).toBe(false);
    expect(cleanupPlan({ unsetAccountId: true }).unsetExpenseAccountId).toBe(true);
  });

  it("finds users still carrying any money field", () => {
    expect(legacyUserFilter()).toEqual({ $or: LEGACY_USER_FIELDS.map((f) => ({ [f]: { $exists: true } })) });
  });
});
