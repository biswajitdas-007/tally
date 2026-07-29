import { describe, expect, it } from "vitest";
import { recentActivity } from "./activity";
import type { Expense, FinanceEntry } from "./types";

const E = (o: Partial<Expense>): Expense =>
  ({ id: "x", groupId: null, description: "", amount: 0, category: "food",
     paidBy: "me", splits: [], date: "", createdBy: "me", createdAt: "", ...o }) as Expense;
const F = (o: Partial<FinanceEntry>): FinanceEntry =>
  ({ id: "f", type: "expense", amount: 0, category: "food", date: "", createdAt: "", ...o }) as FinanceEntry;

const exp = [E({ id: "e1", date: "2026-07-05T00:00:00Z" }), E({ id: "e2", date: "2026-07-01T00:00:00Z" })];
const fin = [
  F({ id: "f1", date: "2026-07-03T00:00:00Z" }),
  F({ id: "f2", date: "2026-07-07T00:00:00Z" }),
  F({ id: "t1", date: "2026-07-06T00:00:00Z", transfer: true }),
];

describe("recentActivity", () => {
  it("interleaves your own money with splits, newest first", () => {
    expect(recentActivity(exp, fin, 10, true).map((i) => i.id)).toEqual(["f2", "e1", "f1", "e2"]);
  });

  it("tags what each row is", () => {
    expect(recentActivity(exp, fin, 10, true).map((i) => i.kind)).toEqual(["money", "split", "money", "split"]);
  });

  it("leaves out internal transfers — nothing actually moved", () => {
    expect(recentActivity(exp, fin, 10, true).some((i) => i.id === "t1")).toBe(false);
  });

  it("shows splits only for people who don't track their own money", () => {
    expect(recentActivity(exp, fin, 10, false).map((i) => i.id)).toEqual(["e1", "e2"]);
  });

  it("respects the limit and copes with nothing", () => {
    expect(recentActivity(exp, fin, 2, true).map((i) => i.id)).toEqual(["f2", "e1"]);
    expect(recentActivity([], [], 5, true)).toHaveLength(0);
  });
});
