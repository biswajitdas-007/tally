import { describe, expect, it } from "vitest";
import { confirmed, daysSince, lastCheckedLabel, needsCheck, reconciled, staleAccounts, RECONCILE_DAYS } from "./reconcile";
import type { Account } from "./types";

const NOW = new Date(2026, 6, 15);
const ago = (d: number) => new Date(NOW.getTime() - d * 86400000).toISOString();
const A = (o: Partial<Account>): Account => ({ id: "a", name: "HDFC", kind: "bank", balance: 10000, ...o });

describe("needsCheck", () => {
  it("asks about an account that has never been confirmed", () => {
    expect(needsCheck(A({}), NOW)).toBe(true);
  });

  it("stays quiet until the window is up", () => {
    expect(needsCheck(A({ reconciledAt: ago(0) }), NOW)).toBe(false);
    expect(needsCheck(A({ reconciledAt: ago(RECONCILE_DAYS - 1) }), NOW)).toBe(false);
    expect(needsCheck(A({ reconciledAt: ago(RECONCILE_DAYS) }), NOW)).toBe(true);
  });

  it("never asks about investments — their value moves on its own", () => {
    expect(needsCheck(A({ kind: "investment" }), NOW)).toBe(false);
    expect(needsCheck(A({ kind: "investment", reconciledAt: undefined }), NOW)).toBe(false);
  });
});

describe("staleAccounts", () => {
  const list = [
    A({ id: "fresh", reconciledAt: ago(2) }),
    A({ id: "old", reconciledAt: ago(90) }),
    A({ id: "never" }),
    A({ id: "inv", kind: "investment" }),
    A({ id: "mid", reconciledAt: ago(40) }),
  ];

  it("returns only the ones due", () => {
    expect(staleAccounts(list, NOW).map((s) => s.account.id).sort()).toEqual(["mid", "never", "old"]);
  });

  it("puts never-checked first, then the longest neglected", () => {
    expect(staleAccounts(list, NOW).map((s) => s.account.id)).toEqual(["never", "old", "mid"]);
  });
});

describe("applying a confirmed balance", () => {
  it("shifts the baseline by the drift, leaving logged history alone", () => {
    // stored baseline 10000, live shows 9500, bank actually says 9000
    const fixed = reconciled(A({ balance: 10000 }), 9000, 9500, NOW);
    expect(fixed.balance).toBe(9500);
    expect(fixed.reconciledAt).toBeTruthy();
  });

  it("works upward too", () => {
    expect(reconciled(A({ balance: 10000 }), 10500, 10000, NOW).balance).toBe(10500);
  });

  it("only stamps when the figure was already right", () => {
    const c = confirmed(A({ balance: 777 }), NOW);
    expect(c.balance).toBe(777);
    expect(c.reconciledAt).toBeTruthy();
  });
});

describe("lastCheckedLabel", () => {
  it.each([
    [null, "never checked"],
    [0, "checked today"],
    [1, "checked yesterday"],
    [5, "checked 5 days ago"],
    [21, "checked 3 weeks ago"],
    [90, "checked 3 months ago"],
  ])("describes %s", (days, expected) => {
    expect(lastCheckedLabel(days)).toBe(expected);
  });

  it("reads a date", () => {
    expect(daysSince(undefined, NOW)).toBeNull();
    expect(daysSince(ago(5), NOW)).toBe(5);
  });
});
