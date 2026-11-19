import { describe, expect, it } from "vitest";
import { duePeriods } from "./recurring";
import { repeatBaseline } from "./repeat";
import type { Recurring } from "./types";

const d = (y: number, m: number, day: number) => new Date(y, m - 1, day);
const due = (date: Date, since: Date, now: Date) => {
  const rule: Recurring = {
    id: "r", type: "expense", amount: 1, category: "rent", freq: "monthly", day: date.getDate(), auto: true,
    lastRun: repeatBaseline("monthly", date, since), createdAt: since.toISOString(),
  };
  return duePeriods(rule, now).map((p) => p.key);
};

describe("repeatBaseline", () => {
  it("still repeats an ordinary monthly expense the next month", () => {
    // Dated and created 5 Nov; on 5 Dec the December copy is due.
    expect(due(d(2026, 11, 5), d(2026, 11, 5), d(2026, 12, 5))).toEqual(["2026-12"]);
  });

  it("doesn't replay the months a back-dated expense 'missed'", () => {
    // Dated 10 May, set to repeat on 20 Nov: nothing until 10 Dec.
    expect(due(d(2026, 5, 10), d(2026, 11, 20), d(2026, 11, 21))).toEqual([]);
    expect(due(d(2026, 5, 10), d(2026, 11, 20), d(2026, 12, 10))).toEqual(["2026-12"]);
  });

  it("doesn't duplicate a future-dated expense in its own month", () => {
    // Created 5 Nov for the 25th: the original covers November.
    expect(repeatBaseline("monthly", d(2026, 11, 25), d(2026, 11, 5))).toBe("2026-11");
  });

  it("falls back to the expense's own period when creation time is unknown", () => {
    expect(repeatBaseline("monthly", d(2026, 5, 10), new Date("not a date"))).toBe("2026-05");
  });
});
