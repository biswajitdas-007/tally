import { describe, expect, it } from "vitest";
import { cardStatus, liveLiabilityOutstanding, markManualPaid, startOfToday } from "./liabilities";
import type { Expense, FinanceEntry, Liability } from "./types";

const ME = "me";
const BASELINE = "2026-09-01T00:00:00.000Z";

const card = (patch: Partial<Liability> = {}): Liability => ({
  id: "card-1",
  name: "Millennia",
  kind: "card",
  outstanding: 0,
  limit: 50_000,
  baselineAt: BASELINE,
  ...patch,
});

const spend = (amount: number, date: string, accountId = "card-1"): FinanceEntry => ({
  id: `f-${date}-${amount}`,
  type: "expense",
  amount,
  category: "shopping",
  date,
  createdAt: date,
  accountId,
});

const payment = (amount: number, date: string): FinanceEntry => ({
  id: `p-${date}-${amount}`,
  type: "income",
  amount,
  category: "other",
  date,
  createdAt: date,
  accountId: "card-1",
  transfer: true,
});

const split = (amount: number, date: string, paidBy = ME): Expense => ({
  id: `e-${date}-${amount}`,
  groupId: null,
  description: "Dinner",
  amount,
  category: "food",
  paidBy,
  splits: [{ personId: ME, amount: amount / 2 }, { personId: "friend", amount: amount / 2 }],
  date,
  createdBy: ME,
  createdAt: date,
  accountId: "card-1",
});

describe("live card balance", () => {
  it("adds what was charged to the card after the baseline", () => {
    const out = liveLiabilityOutstanding(card(), [spend(1_200, "2026-09-04T10:00:00.000Z")], [], ME);
    expect(out).toBe(1_200);
  });

  it("charges the full amount of a split the user fronted on the card", () => {
    // The whole bill hit the card even though only half of it is their share.
    const out = liveLiabilityOutstanding(card(), [], [split(2_000, "2026-09-04T10:00:00.000Z")], ME);
    expect(out).toBe(2_000);
  });

  it("ignores a split someone else paid for", () => {
    const out = liveLiabilityOutstanding(card(), [], [split(2_000, "2026-09-04T10:00:00.000Z", "friend")], ME);
    expect(out).toBe(0);
  });

  it("subtracts payments made against the card", () => {
    const out = liveLiabilityOutstanding(
      card(),
      [spend(5_000, "2026-09-04T10:00:00.000Z"), payment(2_000, "2026-09-20T10:00:00.000Z")],
      [],
      ME,
    );
    expect(out).toBe(3_000);
  });

  it("leaves entries from before the baseline out of the sum", () => {
    // They already sit inside the stated figure; counting them would double up.
    const out = liveLiabilityOutstanding(
      card({ outstanding: 8_000 }),
      [spend(5_000, "2026-08-15T10:00:00.000Z"), payment(1_000, "2026-08-20T10:00:00.000Z")],
      [],
      ME,
    );
    expect(out).toBe(8_000);
  });

  it("ignores entries against a different account", () => {
    const out = liveLiabilityOutstanding(card(), [spend(900, "2026-09-04T10:00:00.000Z", "acc-bank")], [], ME);
    expect(out).toBe(0);
  });

  it("stands on the stored figure when no baseline has been stamped yet", () => {
    const out = liveLiabilityOutstanding(
      card({ baselineAt: undefined, outstanding: 4_000 }),
      [spend(5_000, "2026-09-04T10:00:00.000Z")],
      [],
      ME,
    );
    expect(out).toBe(4_000);
  });

  it("does not derive a loan from card-style entries", () => {
    const loan = card({ kind: "loan", outstanding: 90_000 });
    expect(liveLiabilityOutstanding(loan, [spend(5_000, "2026-09-04T10:00:00.000Z")], [], ME)).toBe(90_000);
  });
});

describe("card status", () => {
  it("reports headroom and utilisation within the limit", () => {
    const s = cardStatus(card(), [spend(10_000, "2026-09-04T10:00:00.000Z")], [], ME);
    expect(s).toMatchObject({ outstanding: 10_000, available: 40_000, overLimit: false, overBy: 0 });
    expect(s.utilization).toBe(20);
  });

  it("reports how far a bill has run past the limit", () => {
    // Interest and fees can push a balance beyond the limit — it is not clamped.
    const s = cardStatus(card(), [spend(52_500, "2026-09-04T10:00:00.000Z")], [], ME);
    expect(s).toMatchObject({ outstanding: 52_500, overLimit: true, overBy: 2_500, available: 0 });
    expect(s.utilization).toBeCloseTo(105);
  });

  it("treats an overpayment as credit rather than as debt", () => {
    const s = cardStatus(
      card(),
      [spend(1_000, "2026-09-04T10:00:00.000Z"), payment(3_000, "2026-09-20T10:00:00.000Z")],
      [],
      ME,
    );
    expect(s).toMatchObject({ outstanding: -2_000, inCredit: true, overLimit: false });
    // Money sitting on the card is spendable on top of the limit, as banks do it.
    expect(s.available).toBe(52_000);
  });

  it("accepts a late payment the same as any other", () => {
    // Paying after the due date still comes off the balance.
    const s = cardStatus(
      card(),
      [spend(6_000, "2026-09-04T10:00:00.000Z"), payment(4_000, "2026-10-11T10:00:00.000Z")],
      [],
      ME,
    );
    expect(s.outstanding).toBe(2_000);
  });

  it("has no limit to report when none was set", () => {
    const s = cardStatus(card({ limit: undefined }), [spend(3_000, "2026-09-04T10:00:00.000Z")], [], ME);
    expect(s).toMatchObject({ limit: 0, available: 0, utilization: 0, overLimit: false });
  });
});

describe("restating a card", () => {
  it("keeps the balance intact when the available limit is re-entered", () => {
    // What the edit sheet does: read the live figure, store it as the new
    // baseline, and start counting again from now. The position must not move.
    const entries = [spend(12_000, "2026-09-04T10:00:00.000Z"), payment(2_000, "2026-09-20T10:00:00.000Z")];
    const before = liveLiabilityOutstanding(card(), entries, [], ME);
    expect(before).toBe(10_000);

    const limit = 50_000;
    const availableShown = limit - before;
    const restated = card({ outstanding: limit - availableShown, baselineAt: "2026-09-25T00:00:00.000Z" });

    expect(liveLiabilityOutstanding(restated, entries, [], ME)).toBe(10_000);
  });

  it("does not let an EMI schedule move a card's baseline", () => {
    // Confirming a card bill counts the month, but the balance stays derived.
    const l = card({ outstanding: 5_000, emi: 1_500, dueDay: 3, lastPaidMonth: "2026-08" });
    const next = markManualPaid(l, new Date("2026-09-10T04:00:00.000Z"));
    expect(next.outstanding).toBe(5_000);
    expect(next.emisPaid).toBe(1);
  });
});

describe("baseline backfill", () => {
  it("starts the day at India-local midnight", () => {
    expect(startOfToday(new Date("2026-09-11T05:00:00.000Z"))).toBe("2026-09-10T18:30:00.000Z");
    expect(startOfToday(new Date("2026-09-11T18:30:00.000Z"))).toBe("2026-09-11T18:30:00.000Z");
  });

  it("counts an entry made earlier the same day", () => {
    const baselineAt = startOfToday(new Date("2026-09-11T05:00:00.000Z"));
    const out = liveLiabilityOutstanding(card({ baselineAt }), [spend(700, "2026-09-11T04:00:00.000Z")], [], ME);
    expect(out).toBe(700);
  });
});
