import { describe, expect, it } from "vitest";
import { buildPlan, comparePayoff, prioritise, humanMonths } from "./payoff";
import type { Liability } from "./types";

const L = (o: Partial<Liability> & { id: string }): Liability =>
  ({ name: o.id, kind: "loan", outstanding: 100000, emi: 10000, rate: 12, ...o }) as Liability;

const NOW = new Date(2026, 0, 15);

describe("buildPlan", () => {
  it("matches the closed-form amortisation for a single debt", () => {
    // 100000 at 12% paying 10000/mo: n = -ln(1 - Pr/EMI)/ln(1+r) ≈ 10.6 months
    const plan = buildPlan([L({ id: "a" })], "avalanche", 0, {}, NOW);
    expect(plan.applicable).toBe(true);
    expect(plan.months).toBeGreaterThanOrEqual(10);
    expect(plan.months).toBeLessThanOrEqual(12);
    expect(plan.totalInterest).toBeGreaterThan(3000);
    expect(plan.totalInterest).toBeLessThan(8000);
    expect(plan.totalPaid).toBe(100000 + plan.totalInterest);
  });

  it("charges no interest at 0% and clears in exactly principal/emi months", () => {
    const plan = buildPlan([L({ id: "z", rate: 0, outstanding: 50000, emi: 10000 })], "avalanche", 0, {}, NOW);
    expect(plan.months).toBe(5);
    expect(plan.totalInterest).toBe(0);
  });

  it("rolls a cleared debt's EMI into the remaining ones", () => {
    // Without rollover the second debt alone would take 10 months.
    const plan = buildPlan(
      [
        L({ id: "tiny", outstanding: 10000, emi: 10000, rate: 0 }),
        L({ id: "rest", outstanding: 100000, emi: 10000, rate: 0 }),
      ],
      "snowball",
      0,
      {},
      NOW,
    );
    expect(plan.months).toBeLessThan(10);
  });

  it("reports a debt with no EMI rather than silently dropping it", () => {
    const plan = buildPlan([L({ id: "card", emi: undefined })], "avalanche", 0, {}, NOW);
    expect(plan.excluded.map((e) => e.reason)).toEqual(["no-emi"]);
    expect(plan.applicable).toBe(false);
  });

  it("terminates instead of hanging when the EMI can't cover the interest", () => {
    const plan = buildPlan([L({ id: "bad", outstanding: 500000, rate: 36, emi: 5000 })], "avalanche", 0, {}, NOW);
    expect(plan.excluded.map((e) => e.reason)).toEqual(["never-clears"]);
    expect(plan.months).toBeLessThan(600);
  });

  it("plans what it can and still reports what it couldn't", () => {
    const plan = buildPlan([L({ id: "good" }), L({ id: "card", emi: undefined })], "avalanche", 0, {}, NOW);
    expect(plan.order).toHaveLength(1);
    expect(plan.excluded).toHaveLength(1);
  });

  it("is not applicable with nothing owed", () => {
    expect(buildPlan([], "avalanche", 0, {}, NOW).applicable).toBe(false);
    expect(buildPlan([L({ id: "done", outstanding: 0 })], "avalanche", 0, {}, NOW).applicable).toBe(false);
  });

  it("gives every debt a payoff date and interest that sums to the total", () => {
    const plan = buildPlan([L({ id: "a" }), L({ id: "b", outstanding: 40000, emi: 4000, rate: 18 })], "avalanche", 0, {}, NOW);
    expect(plan.order.every((d) => d.clearedOn instanceof Date)).toBe(true);
    const sum = plan.order.reduce((a, d) => a + d.interest, 0);
    expect(Math.abs(sum - plan.totalInterest)).toBeLessThanOrEqual(2);
  });
});

describe("strategy ordering", () => {
  // Deliberately opposed: the smallest balance is also the cheapest rate.
  const keys = [
    { id: "small-cheap", rate: 9, outstanding: 40000 },
    { id: "big-dear", rate: 24, outstanding: 300000 },
  ];

  it("avalanche attacks the highest rate first", () => {
    expect(prioritise(keys, "avalanche")[0].id).toBe("big-dear");
  });

  it("snowball attacks the smallest balance first", () => {
    expect(prioritise(keys, "snowball")[0].id).toBe("small-cheap");
  });

  it("avalanche never costs more interest than snowball", () => {
    const debts = [
      L({ id: "small-cheap", outstanding: 40000, emi: 3000, rate: 9 }),
      L({ id: "big-dear", outstanding: 300000, emi: 10000, rate: 24 }),
    ];
    const av = buildPlan(debts, "avalanche", 5000, {}, NOW);
    const sn = buildPlan(debts, "snowball", 5000, {}, NOW);
    expect(av.totalInterest).toBeLessThanOrEqual(sn.totalInterest);
  });
});

describe("comparePayoff", () => {
  const debts = [
    L({ id: "a", outstanding: 40000, emi: 3000, rate: 9 }),
    L({ id: "b", outstanding: 300000, emi: 10000, rate: 24 }),
  ];

  it("shortens the plan and saves interest", () => {
    const cmp = comparePayoff(debts, "avalanche", 10000, {}, NOW);
    expect(cmp.withExtra.months).toBeLessThan(cmp.base.months);
    expect(cmp.interestSaved).toBeGreaterThan(0);
    expect(cmp.monthsSaved).toBe(cmp.base.months - cmp.withExtra.months);
  });

  it("saves nothing when nothing extra is paid", () => {
    expect(comparePayoff(debts, "avalanche", 0, {}, NOW).monthsSaved).toBe(0);
  });
});

describe("humanMonths", () => {
  it.each([
    [0, "now"],
    [1, "1 month"],
    [12, "1 year"],
    [38, "3 years 2 months"],
  ])("formats %i as %s", (n, expected) => {
    expect(humanMonths(n)).toBe(expected);
  });
});
