import { describe, expect, it } from "vitest";
import { emergencyStatus, healthScore, liquidSavings, suggestedEmergency } from "./health";
import type { Account, Expense, FinanceEntry } from "./types";

const iso = (dayAgo: number) => new Date(Date.now() - dayAgo * 86400000).toISOString();
const income: FinanceEntry = { id: "1", type: "income", amount: 100000, category: "salary", date: iso(2), createdAt: iso(2) };
const spend: FinanceEntry = { id: "2", type: "expense", amount: 30000, category: "rent", date: iso(3), createdAt: iso(3) };
const acct: Account = { id: "a", name: "HDFC", kind: "bank", balance: 50000 };

const H = (o: Partial<{ finance: FinanceEntry[]; accounts: Account[]; emergency: { target: number } | null }>) =>
  healthScore({
    finance: o.finance ?? [], expenses: [] as Expense[], meId: "me",
    budget: { limits: {} }, accounts: o.accounts ?? [], liabilities: [],
    emergency: (o.emergency ?? null) as never,
  });

describe("setup state", () => {
  it("withholds a grade until the score can mean something", () => {
    const blank = H({});
    expect(blank.ready).toBe(false);
    expect([blank.setupDone, blank.setupTotal]).toEqual([0, 4]);
    expect(blank.nudge).toBe("Finish setting up and we'll score your finances.");
  });

  it("names income as the gap when only spending is logged", () => {
    // This is the case that used to show a bare F.
    const s = H({ finance: [spend], accounts: [acct] });
    expect(s.ready).toBe(false);
    expect(s.setup.filter((x) => x.required && !x.done).map((x) => x.key)).toEqual(["income"]);
  });

  it.each([
    ["spending", { finance: [income], accounts: [acct] }, "spending"],
    ["accounts", { finance: [income, spend] }, "accounts"],
  ])("names %s as the gap", (_label, patch, expected) => {
    const s = H(patch);
    expect(s.ready).toBe(false);
    expect(s.setup.filter((x) => x.required && !x.done).map((x) => x.key)).toEqual([expected]);
  });

  it("scores properly once the three required steps are done", () => {
    const ready = H({ finance: [income, spend], accounts: [acct] });
    expect(ready.ready).toBe(true);
    expect(ready.setupDone).toBe(3);
    expect(ready.grade).toHaveLength(1);
    expect(ready.nudge).not.toBe("Finish setting up and we'll score your finances.");
  });

  it("treats the emergency fund as optional, never a blocker", () => {
    const withEf = H({ finance: [income, spend], accounts: [acct], emergency: { target: 100000 } });
    expect(withEf.ready).toBe(true);
    expect(withEf.setupDone).toBe(4);
  });
});

describe("emergency fund", () => {
  it("is never inferred from savings", () => {
    const s = emergencyStatus(null, [acct]);
    expect(s.set).toBe(false);
    expect(s.funded).toBe(false);
  });

  it("measures against a linked account when there is one", () => {
    const accounts = [acct, { id: "b", name: "Fund", kind: "bank", balance: 200000 } as Account];
    const s = emergencyStatus({ target: 150000, accountId: "b" }, accounts);
    expect(s.coverage).toBe(200000);
    expect(s.funded).toBe(true);
  });

  it("flags a dip below the target", () => {
    const s = emergencyStatus({ target: 100000 }, [acct]);
    expect(s.dipped).toBe(true);
    expect(s.short).toBe(50000);
  });

  it("excludes investments from liquid savings", () => {
    const accounts = [acct, { id: "i", name: "SIP", kind: "investment", balance: 500000 } as Account];
    expect(liquidSavings(accounts)).toBe(50000);
  });

  it("suggests around six months of outflow, rounded", () => {
    expect(suggestedEmergency(20000)).toBe(120000);
    expect(suggestedEmergency(0)).toBe(0);
  });
});
