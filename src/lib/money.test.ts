import { describe, expect, it } from "vitest";
import { clampMonth, missingIncome, monthFromParam, suggestedBudget } from "./money";
import type { Expense, FinanceEntry } from "./types";

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
    expect(suggestedBudget(finance, [] as Expense[], "me", NOW)).toBe(21000);
  });

  it("never suggests less than you actually spend", () => {
    // Rounding to nearest would give 20000 here — under the average, so the
    // budget would be blown the moment it's accepted.
    const finance = [spend("a", 20400, inMonth(1)), spend("b", 20400, inMonth(2))];
    const suggestion = suggestedBudget(finance, [] as Expense[], "me", NOW);
    expect(suggestion).toBeGreaterThanOrEqual(20400);
  });

  it("ignores the current month, which is still running", () => {
    const finance = [spend("now", 99999, inMonth(0)), spend("a", 12000, inMonth(1))];
    expect(suggestedBudget(finance, [] as Expense[], "me", NOW)).toBe(12000);
  });

  it("has nothing to suggest without history", () => {
    expect(suggestedBudget([], [] as Expense[], "me", NOW)).toBe(0);
  });
});

describe("missingIncome", () => {
  const threeSpends = [
    spend("a", 500, inMonth(0, 1)),
    spend("b", 500, inMonth(0, 2)),
    spend("c", 500, inMonth(0, 3)),
  ];

  it("spots spending logged with no income at all", () => {
    expect(missingIncome(threeSpends, [] as Expense[], "me", NOW)).toBe(true);
  });

  it("stays quiet once income is logged", () => {
    expect(missingIncome([...threeSpends, earn("i", 50000, inMonth(0, 4))], [] as Expense[], "me", NOW)).toBe(false);
  });

  it("doesn't nag someone who has barely started", () => {
    expect(missingIncome([spend("a", 500, inMonth(0))], [] as Expense[], "me", NOW)).toBe(false);
  });

  it("says nothing when there's no spending either", () => {
    expect(missingIncome([], [] as Expense[], "me", NOW)).toBe(false);
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
