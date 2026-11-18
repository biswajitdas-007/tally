import { describe, expect, it } from "vitest";
import { clampMonth, missingIncome, monthFromParam, monthlyMoney, spendByCategory, suggestedBudget } from "./money";
import type { FinanceEntry } from "./types";

const NOW = new Date(2026, 6, 15); // 15 Jul 2026
const inMonth = (monthsAgo: number, day = 10) =>
  new Date(NOW.getFullYear(), NOW.getMonth() - monthsAgo, day).toISOString();

const spend = (id: string, amount: number, date: string): FinanceEntry =>
  ({ id, type: "expense", amount, category: "food", date, createdAt: date }) as FinanceEntry;
const earn = (id: string, amount: number, date: string): FinanceEntry =>
  ({ id, type: "income", amount, category: "salary", date, createdAt: date }) as FinanceEntry;

describe("suggestedBudget", () => {
  it("averages the last three months and rounds up to a clean figure", () => {
    // (20400 + 19800 + 21300) / 3 = 20500 → 21000
    const finance = [
      spend("a", 20400, inMonth(1)),
      spend("b", 19800, inMonth(2)),
      spend("c", 21300, inMonth(3)),
    ];
    expect(suggestedBudget(finance, NOW)).toBe(21000);
  });

  it("never suggests less than you actually spend", () => {
    // Rounding to nearest would give 20000 here — under the average, so the
    // budget would be blown the moment it's accepted.
    const finance = [spend("a", 20400, inMonth(1)), spend("b", 20400, inMonth(2))];
    const suggestion = suggestedBudget(finance, NOW);
    expect(suggestion).toBeGreaterThanOrEqual(20400);
  });

  it("ignores the current month, which is still running", () => {
    const finance = [spend("now", 99999, inMonth(0)), spend("a", 12000, inMonth(1))];
    expect(suggestedBudget(finance, NOW)).toBe(12000);
  });

  it("has nothing to suggest without history", () => {
    expect(suggestedBudget([], NOW)).toBe(0);
  });
});

describe("missingIncome", () => {
  const threeSpends = [
    spend("a", 500, inMonth(0, 1)),
    spend("b", 500, inMonth(0, 2)),
    spend("c", 500, inMonth(0, 3)),
  ];

  it("spots spending logged with no income at all", () => {
    expect(missingIncome(threeSpends, NOW)).toBe(true);
  });

  it("stays quiet once income is logged", () => {
    expect(missingIncome([...threeSpends, earn("i", 50000, inMonth(0, 4))], NOW)).toBe(false);
  });

  it("doesn't nag someone who has barely started", () => {
    expect(missingIncome([spend("a", 500, inMonth(0))], NOW)).toBe(false);
  });

  it("says nothing when there's no spending either", () => {
    expect(missingIncome([], NOW)).toBe(false);
  });
});

describe("monthFromParam", () => {
  const NOW_M = new Date(2026, 6, 20); // July 2026

  it("reads a valid month", () => {
    expect(monthFromParam("2026-03", NOW_M)).toEqual(new Date(2026, 2, 1));
  });

  it("falls back to the current month when there's no parameter", () => {
    expect(monthFromParam(null, NOW_M)).toEqual(new Date(2026, 6, 1));
    expect(monthFromParam(undefined, NOW_M)).toEqual(new Date(2026, 6, 1));
  });

  it.each(["2026-3", "26-03", "2026-13", "2026-00", "not-a-month", "2026-03-15", ""])(
    "rejects %s rather than producing an Invalid Date",
    (bad) => {
      expect(monthFromParam(bad, NOW_M)).toEqual(new Date(2026, 6, 1));
    },
  );

  it("won't travel to a month that hasn't happened", () => {
    expect(monthFromParam("2027-01", NOW_M)).toEqual(new Date(2026, 6, 1));
  });

  it("allows the current month itself", () => {
    expect(monthFromParam("2026-07", NOW_M)).toEqual(new Date(2026, 6, 1));
  });
});

describe("clampMonth", () => {
  const NOW_C = new Date(2026, 6, 20); // July 2026

  it("snaps to the first of the month", () => {
    expect(clampMonth(new Date(2026, 2, 17), NOW_C)).toEqual(new Date(2026, 2, 1));
  });

  it("won't go past the current month", () => {
    expect(clampMonth(new Date(2026, 8, 1), NOW_C)).toEqual(new Date(2026, 6, 1));
  });

  it("lets the current month through", () => {
    expect(clampMonth(new Date(2026, 6, 31), NOW_C)).toEqual(new Date(2026, 6, 1));
  });

  it("rolls the year over going backwards", () => {
    expect(clampMonth(new Date(2026, -1, 1), NOW_C)).toEqual(new Date(2025, 11, 1));
  });
});

describe("monthlyMoney", () => {
  const key = "2026-07";
  const move = (id: string, amount: number, type: "income" | "expense"): FinanceEntry =>
    ({ id, type, amount, category: "other", date: inMonth(0), createdAt: inMonth(0), transfer: true }) as FinanceEntry;

  it("totals the month's own entries", () => {
    const m = monthlyMoney([earn("i", 50000, inMonth(0)), spend("a", 1200, inMonth(0)), spend("b", 800, inMonth(0))], key);
    expect(m).toEqual({ income: 50000, spend: 2000, net: 48000 });
  });

  it("leaves out other months and transfers between your own accounts", () => {
    const m = monthlyMoney([spend("old", 999, inMonth(1)), move("t1", 5000, "expense"), move("t2", 5000, "income")], key);
    expect(m).toEqual({ income: 0, spend: 0, net: 0 });
  });
});

describe("spendByCategory", () => {
  it("groups the month's spending, largest first, ignoring income and transfers", () => {
    const rent = { ...spend("r", 20000, inMonth(0)), category: "rent" } as FinanceEntry;
    const moved = { ...spend("t", 7000, inMonth(0)), transfer: true } as FinanceEntry;
    const out = spendByCategory([spend("a", 300, inMonth(0)), spend("b", 200, inMonth(0)), rent, moved, earn("i", 1, inMonth(0))], "2026-07");
    expect(out).toEqual([
      { category: "rent", amount: 20000 },
      { category: "food", amount: 500 },
    ]);
  });
});
