import { describe, expect, it } from "vitest";
import { usesMoney, type MoneySignals } from "./money-mode";

const base: MoneySignals = { finance: [], accounts: [], liabilities: [], budget: { limits: {} }, emergency: null };
const signals = (o: Partial<MoneySignals>) => usesMoney({ ...base, ...o });

describe("usesMoney", () => {
  it("defaults to splits-only with nothing logged", () => {
    expect(signals({})).toBe(false);
  });

  it("lets an explicit choice win either way", () => {
    expect(signals({ pref: true })).toBe(true);
    expect(signals({ pref: false, accounts: [{ id: "a" }] as never })).toBe(false);
  });

  it.each([
    ["an account", { accounts: [{ id: "a" }] as never }],
    ["a loan", { liabilities: [{ id: "l" }] as never }],
    ["a budget", { budget: { limits: {}, monthly: 5000 } }],
    ["an emergency fund", { emergency: { target: 1 } as never }],
  ])("infers money tracking from %s", (_label, patch) => {
    expect(signals(patch)).toBe(true);
  });

  it("doesn't count a zeroed budget", () => {
    expect(signals({ budget: { limits: {}, monthly: 0 } })).toBe(false);
  });
});
