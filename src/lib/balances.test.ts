import { describe, expect, it } from "vitest";
import { pendingFromSplits, splitOverview } from "./balances";
import type { Expense } from "./types";

const E = (o: Partial<Expense>): Expense =>
  ({
    id: "x", groupId: null, description: "", amount: 0, category: "food",
    paidBy: "me", splits: [], date: "", createdBy: "me", createdAt: "", ...o,
  }) as Expense;

describe("splitOverview", () => {
  // Balances are simplified within each scope — the same model the rest of the
  // app shows — so these are net positions, not raw pairwise sums.
  const exp = [
    E({ id: "d1", amount: 1000, paidBy: "me", splits: [{ personId: "me", amount: 500 }, { personId: "A", amount: 500 }] }),
    E({ id: "d2", amount: 600, paidBy: "B", splits: [{ personId: "me", amount: 300 }, { personId: "B", amount: 300 }] }),
    E({ id: "g1", groupId: "g1", amount: 900, paidBy: "me",
        splits: [{ personId: "me", amount: 300 }, { personId: "C", amount: 300 }, { personId: "D", amount: 300 }] }),
    E({ id: "g2", groupId: "g2", amount: 400, paidBy: "C",
        splits: [{ personId: "me", amount: 200 }, { personId: "C", amount: 200 }] }),
  ];

  it("separates one-on-one from group", () => {
    const o = splitOverview(exp, "me");
    expect(o.direct.net).toBe(200); // owed 500, owe 300
    expect(o.group.net).toBe(400); // owed 600, owe 200
    expect(o.direct.groups).toBe(0);
    expect(o.group.groups).toBe(2);
  });

  it("adds up to the overall net", () => {
    const o = splitOverview(exp, "me");
    expect(Math.round(o.all.net)).toBe(Math.round(o.direct.net + o.group.net));
  });

  it("reports the owing side when you're behind", () => {
    const owing = [E({ amount: 1000, paidBy: "A", splits: [{ personId: "me", amount: 700 }, { personId: "A", amount: 300 }] })];
    const o = splitOverview(owing, "me");
    expect([o.direct.owedToYou, o.direct.youOwe]).toEqual([0, 700]);
    expect(o.group.people).toBe(0);
  });

  it("goes square once settled", () => {
    const owing = E({ id: "o1", amount: 1000, paidBy: "A", splits: [{ personId: "me", amount: 700 }, { personId: "A", amount: 300 }] });
    const settle = E({ id: "s1", amount: 700, paidBy: "me", splits: [{ personId: "A", amount: 700 }], isSettlement: true });
    expect(splitOverview([owing, settle], "me").direct.net).toBe(0);
  });
});

describe("pendingFromSplits", () => {
  it("counts what comes back when others settle", () => {
    // I paid 3000 for three people — 2000 of it isn't really my spending.
    const paid = [E({ amount: 3000, paidBy: "me",
      splits: [{ personId: "me", amount: 1000 }, { personId: "A", amount: 1000 }, { personId: "B", amount: 1000 }] })];
    const p = pendingFromSplits(paid, "me");
    expect(p.incoming).toBe(2000);
    expect(p.outgoing).toBe(0);
    expect(p.net).toBe(2000);
    expect(p.any).toBe(true);
  });

  it("counts what still has to go out", () => {
    const owed = [E({ amount: 1000, paidBy: "A", splits: [{ personId: "me", amount: 400 }, { personId: "A", amount: 600 }] })];
    const p = pendingFromSplits(owed, "me");
    expect([p.incoming, p.outgoing, p.net]).toEqual([0, 400, -400]);
  });

  it("has nothing to say once everything is settled", () => {
    expect(pendingFromSplits([], "me").any).toBe(false);
  });
});
