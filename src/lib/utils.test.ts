import { describe, expect, it } from "vitest";
import {
  AVATAR_COLORS,
  DEFAULT_AVATAR_COLOR,
  PLACEHOLDER_AVATAR_COLOR,
  avatarColor,
  percentShares,
} from "./utils";

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

/** WCAG relative luminance contrast between two #rrggbb colours. */
function contrast(a: string, b: string): number {
  const lum = (hex: string) => {
    const [r, g, bl] = [1, 3, 5].map((i) => {
      const c = parseInt(hex.slice(i, i + 2), 16) / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe("avatar colours", () => {
  it("keep white initials at WCAG AA contrast", () => {
    for (const c of [...AVATAR_COLORS, PLACEHOLDER_AVATAR_COLOR]) {
      expect(contrast(c, "#ffffff"), c).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("start the palette with the default colour", () => {
    expect(AVATAR_COLORS[0]).toBe(DEFAULT_AVATAR_COLOR);
  });

  it("map a seed to a stable palette slot", () => {
    expect(avatarColor("riya")).toBe(AVATAR_COLORS[7]);
    expect(avatarColor("kabir")).toBe(AVATAR_COLORS[1]);
  });
});
