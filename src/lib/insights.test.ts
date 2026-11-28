import { describe, expect, it } from "vitest";
import { spendByGroup } from "./insights";
import type { Expense, Group } from "./types";

const E = (o: Partial<Expense>): Expense =>
  ({ id: "x", groupId: null, description: "", amount: 0, category: "food", paidBy: "me",
     splits: [], date: "2026-11-01T00:00:00Z", createdBy: "me", createdAt: "", ...o }) as Expense;
const G = (id: string, name: string, icon: string): Group =>
  ({ id, name, icon, color: "var(--cat-rent)", memberIds: ["me"], createdAt: "" }) as Group;

describe("spendByGroup", () => {
  const groups = [G("g1", "Goa", "trip"), G("g2", "Flat", "home")];
  const split = (amount: number, groupId: string | null, mine: number) =>
    E({ amount, groupId, splits: [{ personId: "me", amount: mine }, { personId: "x", amount: amount - mine }] });

  it("sums your share per group and one-on-one, largest first", () => {
    const rows = spendByGroup(
      [split(1000, "g1", 500), split(600, "g1", 300), split(400, "g2", 200), split(300, null, 150)],
      groups,
      "me",
    );
    expect(rows.map((r) => [r.id, r.amount])).toEqual([["g1", 800], ["g2", 200], ["personal", 150]]);
    expect(rows[0]).toMatchObject({ name: "Goa", icon: "trip", personal: false });
    expect(rows[2]).toMatchObject({ name: "Personal / 1-on-1", icon: null, personal: true });
  });

  it("skips settlements and tiny amounts, and copes with a deleted group", () => {
    const rows = spendByGroup(
      [E({ amount: 500, groupId: "g1", isSettlement: true, splits: [{ personId: "me", amount: 500 }] }),
       split(10, "g2", 0.2),
       split(200, "gone", 100)],
      groups,
      "me",
    );
    expect(rows).toEqual([{ id: "gone", personal: false, name: "—", icon: null, amount: 100 }]);
  });
});
