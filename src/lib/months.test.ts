import { describe, expect, it } from "vitest";
import { clampMonth, monthFromParam } from "./months";


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
