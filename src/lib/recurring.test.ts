import { describe, expect, it } from "vitest";
import { duePeriods, lastOccurrence, nextOccurrence, periodKey, recurLabel, stampCurrent } from "./recurring";
import type { Recurring } from "./types";

const rule = (o: Partial<Recurring>): Recurring => ({
  id: "r1",
  type: "income",
  amount: 1000,
  category: "salary",
  freq: "monthly",
  day: 1,
  auto: true,
  createdAt: "2026-01-01T00:00:00Z",
  ...o,
});

const JUL_15 = new Date(2026, 6, 15); // a Wednesday
const keys = (r: Recurring, now: Date) => duePeriods(r, now).map((d) => d.key);

describe("monthly schedule", () => {
  it("finds the most recent occurrence", () => {
    expect(periodKey("monthly", lastOccurrence("monthly", 1, JUL_15))).toBe("2026-07");
    // the 20th hasn't happened yet this month
    expect(periodKey("monthly", lastOccurrence("monthly", 20, JUL_15))).toBe("2026-06");
  });

  it("never fires without a stamp — we can't know what's already been done", () => {
    expect(duePeriods(rule({}), JUL_15)).toHaveLength(0);
  });

  it("doesn't repeat a period it has already run", () => {
    expect(duePeriods(rule({ lastRun: "2026-07" }), JUL_15)).toHaveLength(0);
  });

  it("catches up missed months, oldest first", () => {
    expect(keys(rule({ lastRun: "2026-04" }), JUL_15)).toEqual(["2026-05", "2026-06", "2026-07"]);
  });

  it("caps catch-up so a long outage can't flood the ledger", () => {
    expect(duePeriods(rule({ lastRun: "2020-01" }), JUL_15)).toHaveLength(12);
  });

  it("waits for the day of the month to arrive", () => {
    expect(keys(rule({ day: 20, lastRun: "2026-05" }), new Date(2026, 6, 5))).toEqual(["2026-06"]);
  });

  it("dates each entry on the rule's own day", () => {
    expect(duePeriods(rule({ day: 10, lastRun: "2026-05" }), JUL_15).map((d) => d.date.getDate())).toEqual([10, 10]);
  });

  it("stays inside February when the day is clamped", () => {
    expect(duePeriods(rule({ day: 31, lastRun: "2026-01" }), new Date(2026, 1, 28))).toHaveLength(1);
  });

  it("ignores a paused rule", () => {
    expect(duePeriods(rule({ lastRun: "2026-04", paused: true }), JUL_15)).toHaveLength(0);
  });
});

describe("weekly schedule", () => {
  const weekly = (o: Partial<Recurring>) => rule({ freq: "weekly", day: 1, ...o }); // Mondays

  it("anchors to the most recent matching weekday", () => {
    expect(periodKey("weekly", lastOccurrence("weekly", 1, JUL_15))).toBe("2026-07-13");
  });

  it("doesn't repeat within the same week", () => {
    expect(duePeriods(weekly({ lastRun: "2026-07-13" }), JUL_15)).toHaveLength(0);
  });

  it("catches up missed weeks", () => {
    expect(keys(weekly({ lastRun: "2026-06-29" }), JUL_15)).toEqual(["2026-07-06", "2026-07-13"]);
  });
});

describe("stamping a new rule", () => {
  it("doesn't fire for a period that already passed", () => {
    const fresh = rule({ lastRun: stampCurrent("monthly", 1, JUL_15) });
    expect(duePeriods(fresh, JUL_15)).toHaveLength(0);
  });

  it("but does fire on the next one", () => {
    const fresh = rule({ lastRun: stampCurrent("monthly", 1, JUL_15) });
    expect(keys(fresh, new Date(2026, 7, 2))).toEqual(["2026-08"]);
  });
});

describe("labels", () => {
  it("says when the next one lands", () => {
    expect(periodKey("monthly", nextOccurrence("monthly", 1, JUL_15))).toBe("2026-08");
  });

  it.each([
    [1, "Monthly on the 1st"],
    [2, "Monthly on the 2nd"],
    [3, "Monthly on the 3rd"],
    [11, "Monthly on the 11th"],
    [21, "Monthly on the 21st"],
  ])("ordinalises day %i", (day, expected) => {
    expect(recurLabel({ freq: "monthly", day })).toBe(expected);
  });

  it("names the weekday", () => {
    expect(recurLabel({ freq: "weekly", day: 1 })).toBe("Weekly on Monday");
  });
});
