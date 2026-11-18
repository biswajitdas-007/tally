import { describe, expect, it } from "vitest";
import { isEqualSplit } from "./splits";

describe("isEqualSplit", () => {
  it("recognises an equal split, wherever the spare paisa went", () => {
    expect(isEqualSplit(1000, [500, 500])).toBe(true);
    expect(isEqualSplit(100, [33.34, 33.33, 33.33])).toBe(true);
    expect(isEqualSplit(100, [33.33, 33.34, 33.33])).toBe(true);
  });

  it("treats any other split as exact amounts", () => {
    expect(isEqualSplit(1000, [700, 300])).toBe(false);
    expect(isEqualSplit(900, [300, 300, 299])).toBe(false);
  });
});
