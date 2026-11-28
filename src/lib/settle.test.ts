import { describe, expect, it } from "vitest";
import {
  confirmLabel,
  firstName,
  paymentParties,
  reminderText,
  scopeKey,
  settleScopes,
  settleSummary,
  settledMessage,
  settlementEntries,
  upiNote,
} from "./settle";
import type { Expense } from "./types";

const expense = (o: Partial<Expense>): Expense =>
  ({
    id: "e", groupId: null, description: "x", amount: 0, category: "other", paidBy: "me",
    splits: [], date: "2026-11-28T10:00:00.000Z", createdAt: "2026-11-28T10:00:00.000Z", ...o,
  }) as Expense;

// In g1 Riya paid 1,640 split two ways (you owe her 820); directly you paid 600
// split two ways (she owes you 300).
const EXPENSES = [
  expense({ id: "a", groupId: "g1", amount: 1640, paidBy: "riya", splits: [{ personId: "me", amount: 820 }, { personId: "riya", amount: 820 }] }),
  expense({ id: "b", groupId: null, amount: 600, paidBy: "me", splits: [{ personId: "me", amount: 300 }, { personId: "riya", amount: 300 }] }),
];

describe("scopeKey", () => {
  it("gives direct money a key of its own", () => {
    expect(scopeKey(null)).toBe("__direct__");
    expect(scopeKey("g1")).toBe("g1");
  });
});

describe("settleScopes", () => {
  it("offers just the one ledger the sheet was opened on, at its live balance", () => {
    expect(settleScopes({ personId: "riya", amount: -999, groupId: "g1" }, EXPENSES, "me")).toEqual([
      { scopeId: "g1", amount: -820 },
    ]);
    expect(settleScopes({ personId: "riya", amount: 300, groupId: null }, EXPENSES, "me")).toEqual([
      { scopeId: null, amount: 300 },
    ]);
  });

  it("offers every shared ledger when opened on a person", () => {
    const scopes = settleScopes({ personId: "riya", amount: -520 }, EXPENSES, "me");
    expect(scopes).toHaveLength(2);
    expect(scopes).toEqual(expect.arrayContaining([{ scopeId: "g1", amount: -820 }, { scopeId: null, amount: 300 }]));
  });

  it("drops a ledger that got settled while the sheet was open", () => {
    const paid = expense({ id: "s", groupId: "g1", amount: 820, paidBy: "me", splits: [{ personId: "riya", amount: 820 }] });
    const target = { personId: "riya", amount: -820, groupId: "g1" };
    expect(settleScopes(target, [...EXPENSES, paid], "me")).toEqual([]);
    expect(settleScopes({ personId: "riya", amount: -520 }, [...EXPENSES, paid], "me")).toEqual([{ scopeId: null, amount: 300 }]);
  });

  it("offers nothing for someone you have no balance with", () => {
    expect(settleScopes({ personId: "nobody", amount: 0 }, EXPENSES, "me")).toEqual([]);
  });
});

describe("settleSummary", () => {
  const scopes = [{ scopeId: "g1", amount: -820 }, { scopeId: null, amount: 300 }];

  it("nets everything that isn't unticked", () => {
    const s = settleSummary(scopes, new Set());
    expect(s.net).toBe(-520);
    expect(s.amount).toBe(520);
    expect(s.youPay).toBe(true);
    expect(s.settled).toBe(false);
    expect(s.active).toHaveLength(2);
  });

  it("flips direction when only what they owe is left ticked", () => {
    const s = settleSummary(scopes, new Set(["g1"]));
    expect(s.youPay).toBe(false);
    expect(s.amount).toBe(300);
  });

  it("is settled when everything is unticked or it all nets out", () => {
    expect(settleSummary(scopes, new Set(["g1", "__direct__"])).settled).toBe(true);
    const even = [{ scopeId: "g1", amount: -300 }, { scopeId: null, amount: 300 }];
    const s = settleSummary(even, new Set());
    expect(s.settled).toBe(true);
    expect(s.youPay).toBe(false);
  });
});

describe("paymentParties", () => {
  type Party = { name: string; upiId?: string };
  const me: Party = { name: "Aarav", upiId: "aarav@okaxis" };
  const riya: Party = { name: "Riya", upiId: "riya@okhdfcbank" };

  it("sends the money to them when you pay, and to you when they do", () => {
    expect(paymentParties(true, me, riya)).toEqual({ payer: me, payee: riya, payeeUpi: "riya@okhdfcbank" });
    expect(paymentParties(false, me, riya)).toEqual({ payer: riya, payee: me, payeeUpi: "aarav@okaxis" });
  });

  it("only hands over a UPI ID a UPI app will take", () => {
    expect(paymentParties(true, me, { name: "Riya", upiId: "not a vpa" }).payeeUpi).toBeNull();
    expect(paymentParties(true, me, { name: "Riya" }).payeeUpi).toBeNull();
    expect(paymentParties(false, null, riya)).toEqual({ payer: riya, payee: null, payeeUpi: null });
  });
});

describe("settledMessage", () => {
  it("only says payment recorded when money came to you", () => {
    expect(settledMessage({ youPay: true, settled: false }, "Riya")).toBe("Settled up with Riya");
    expect(settledMessage({ youPay: false, settled: true }, "Riya")).toBe("Settled up with Riya");
    expect(settledMessage({ youPay: false, settled: false }, "Riya")).toBe("Payment recorded");
  });
});

describe("settlementEntries", () => {
  it("records each ledger in its own direction", () => {
    const entries = settlementEntries([{ scopeId: "g1", amount: -820 }, { scopeId: null, amount: 300 }], "me", "riya");
    expect(entries).toEqual([
      { from: "me", to: "riya", amount: 820, groupId: "g1" },
      { from: "riya", to: "me", amount: 300, groupId: null },
    ]);
  });

  it("skips rounding dust", () => {
    expect(settlementEntries([{ scopeId: "g1", amount: 0.004 }], "me", "riya")).toEqual([]);
  });
});

describe("upiNote", () => {
  const names = (id: string) => (id === "g1" ? "Flat 4B" : undefined);

  it("names a single group", () => {
    expect(upiNote([{ scopeId: "g1", amount: -1 }], names)).toBe("Tally - Flat 4B");
  });

  it("falls back for direct money, several ledgers or an unknown group", () => {
    expect(upiNote([{ scopeId: null, amount: -1 }], names)).toBe("Tally settle-up");
    expect(upiNote([{ scopeId: "g1", amount: -1 }, { scopeId: null, amount: 1 }], names)).toBe("Tally settle-up");
    expect(upiNote([{ scopeId: "gone", amount: -1 }], names)).toBe("Tally settle-up");
  });
});

describe("confirmLabel", () => {
  it("says what the press records", () => {
    expect(confirmLabel({ settled: true, youPay: false }, "₹0")).toBe("Mark settled");
    expect(confirmLabel({ settled: false, youPay: true }, "₹820")).toBe("I've paid ₹820");
    expect(confirmLabel({ settled: false, youPay: false }, "₹300")).toBe("Mark ₹300 received");
  });
});

describe("reminderText", () => {
  it("adds your UPI ID when you have one", () => {
    expect(reminderText("Riya", "₹300", "me@okaxis")).toBe("Hi Riya, you owe me ₹300 on Tally. Pay to me@okaxis");
    expect(reminderText("Riya", "₹300")).toBe("Hi Riya, you owe me ₹300 on Tally.");
  });
});

describe("firstName", () => {
  it("takes the first word, with a fallback", () => {
    expect(firstName("Riya Sharma")).toBe("Riya");
    expect(firstName("  Riya  ")).toBe("Riya");
    expect(firstName(undefined)).toBe("them");
    expect(firstName("", "payee")).toBe("payee");
  });
});
