import { describe, expect, it } from "vitest";
import { recentActivity } from "./activity";
import type { Expense } from "./types";

const E = (o: Partial<Expense>): Expense =>
  ({ id: "x", groupId: null, description: "", amount: 0, category: "food",
     paidBy: "me", splits: [], date: "", createdBy: "me", createdAt: "", ...o }) as Expense;

const exp = [
  E({ id: "e1", date: "2026-07-05T00:00:00Z" }),
  E({ id: "s1", date: "2026-07-06T00:00:00Z", isSettlement: true }),
  E({ id: "e2", date: "2026-07-01T00:00:00Z" }),
];

describe("recentActivity", () => {
  it("lists splits and settlements newest first", () => {
    expect(recentActivity(exp, 10).map((e) => e.id)).toEqual(["s1", "e1", "e2"]);
  });

  it("respects the limit, leaves the input untouched and copes with nothing", () => {
    expect(recentActivity(exp, 2).map((e) => e.id)).toEqual(["s1", "e1"]);
    expect(exp.map((e) => e.id)).toEqual(["e1", "s1", "e2"]);
    expect(recentActivity([], 5)).toHaveLength(0);
  });
});
