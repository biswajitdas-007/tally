import { describe, expect, it } from "vitest";
import { formatShare, percentShares } from "./utils";

describe("percentShares", () => {
  it("makes a real report's categories add up to 100", () => {
    // The case that started this: 83.10, 10.24, 6.44 and 0.22 each round
    // down to 83, 10, 6, 0 — a column totalling 99 with ₹48 showing as nothing.
    expect(percentShares([18421, 2270, 1428, 48])).toEqual([83, 10, 6, 1]);
  });

  it.each([
    ["even split", [1, 1]],
    ["thirds", [1, 1, 1]],
    ["many tiny values", [1000, 1, 1, 1, 1, 1]],
    ["lopsided", [99999, 1]],
    ["a real month", [18421, 2270, 1428, 48]],
  ])("always totals exactly 100 — %s", (_label, values) => {
    expect(percentShares(values).reduce((a, b) => a + b, 0)).toBe(100);
  });

  it("never shows 0% for a non-zero amount", () => {
    expect(percentShares([1000, 1, 1, 1, 1, 1]).filter((v) => v === 0)).toHaveLength(0);
    expect(percentShares([99999, 1])[1]).toBeGreaterThanOrEqual(1);
  });

  it("leaves genuine zeros at zero", () => {
    expect(percentShares([100, 0, 0])).toEqual([100, 0, 0]);
  });

  it("handles the degenerate cases", () => {
    expect(percentShares([])).toEqual([]);
    expect(percentShares([0, 0])).toEqual([0, 0]);
    expect(percentShares([500])).toEqual([100]);
    expect(percentShares([100, -5]).reduce((a, b) => a + b, 0)).toBe(100);
  });
});

describe("formatShare", () => {
  it.each([
    [48, 22167, "<1%"],
    [0, 100, "0%"],
    [25, 100, "25%"],
    [999, 1000, ">99%"],
    [100, 100, "100%"],
  ])("formats %i of %i as %s", (part, total, expected) => {
    expect(formatShare(part, total)).toBe(expected);
  });
});
