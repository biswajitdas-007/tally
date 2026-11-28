import { describe, expect, it } from "vitest";
import {
  computeSplits,
  exactRemaining,
  expensePayload,
  initialExpenseForm,
  isExpenseFormValid,
  parseAmount,
  splitPool,
  type ExpenseFormState,
} from "./expense-form";
import type { Expense, Group } from "./types";

const NOW = new Date("2026-11-28T10:00:00.000Z");
const group = (o: Partial<Group> = {}): Group =>
  ({ id: "g1", name: "Goa", icon: "trip", color: "var(--cat-travel)", memberIds: ["me", "a", "b"], createdAt: "", ...o }) as Group;
const expense = (o: Partial<Expense> = {}): Expense =>
  ({
    id: "e1", groupId: "g1", description: "Dinner", amount: 300, category: "food", paidBy: "a",
    splits: [{ personId: "me", amount: 100 }, { personId: "a", amount: 100 }, { personId: "b", amount: 100 }],
    date: "2026-11-20T12:00:00.000Z", createdBy: "me", createdAt: "", ...o,
  }) as Expense;
const form = (o: Partial<ExpenseFormState> = {}): ExpenseFormState => ({
  ...initialExpenseForm({ editing: null, groupCtx: null, groups: [], myId: "me", now: NOW }),
  ...o,
});

describe("initialExpenseForm", () => {
  it("starts a blank expense paid by you, split with you", () => {
    const s = initialExpenseForm({ editing: null, groupCtx: null, groups: [], myId: "me", now: NOW });
    expect(s).toMatchObject({ amount: "", description: "", category: "food", categoryTouched: false, groupId: null, paidBy: "me", participants: ["me"], splitMode: "equal", recurring: false, showNotes: false });
    expect(s.date).toBe(NOW);
  });

  it("in a group, starts with its active members (offline ones left out, never you)", () => {
    const g = group({ offlineIds: ["b", "me"] });
    const s = initialExpenseForm({ editing: null, groupCtx: "g1", groups: [g], myId: "me", now: NOW });
    expect(s.groupId).toBe("g1");
    expect(s.participants).toEqual(["me", "a"]);
  });

  it("falls back to every member if all are offline, and to you if the group is gone", () => {
    const allOffline = group({ memberIds: ["a", "b"], offlineIds: ["a", "b"] });
    expect(initialExpenseForm({ editing: null, groupCtx: "g1", groups: [allOffline], myId: "me" }).participants).toEqual(["a", "b"]);
    expect(initialExpenseForm({ editing: null, groupCtx: "gone", groups: [], myId: "me" }).participants).toEqual(["me"]);
  });

  it("reopens an equal split as equal", () => {
    const s = initialExpenseForm({ editing: expense({ notes: "tip incl.", recurring: "weekly" }), groupCtx: null, groups: [], myId: "me" });
    expect(s).toMatchObject({ amount: "300", description: "Dinner", categoryTouched: true, paidBy: "a", participants: ["me", "a", "b"], splitMode: "equal", exact: {}, notes: "tip incl.", showNotes: true, recurring: true });
    expect(s.date.toISOString()).toBe("2026-11-20T12:00:00.000Z");
  });

  it("reopens an unequal split as exact amounts", () => {
    const s = initialExpenseForm({
      editing: expense({ splits: [{ personId: "me", amount: 200 }, { personId: "a", amount: 100 }] }),
      groupCtx: null, groups: [], myId: "me",
    });
    expect(s.splitMode).toBe("exact");
    expect(s.exact).toEqual({ me: "200", a: "100" });
  });
});

describe("splitPool", () => {
  it("is the group's members, or you and your friends", () => {
    expect(splitPool("g1", [group()], ["x"], "me")).toEqual(["me", "a", "b"]);
    expect(splitPool(null, [group()], ["x", "y"], "me")).toEqual(["me", "x", "y"]);
    expect(splitPool("gone", [], ["x"], "me")).toEqual(["me"]);
  });
});

describe("splits and validation", () => {
  it("splits equally to the paisa", () => {
    expect(computeSplits(form({ amount: "100", participants: ["me", "a", "b"] })).map((s) => s.amount)).toEqual([33.34, 33.33, 33.33]);
    expect(computeSplits(form({ amount: "100", participants: [] }))).toEqual([]);
  });

  it("uses the typed amounts in exact mode and tracks what's left", () => {
    const s = form({ amount: "100", participants: ["me", "a"], splitMode: "exact", exact: { me: "60", a: "" } });
    expect(computeSplits(s)).toEqual([{ personId: "me", amount: 60 }, { personId: "a", amount: 0 }]);
    expect(exactRemaining(s)).toBe(40);
    expect(exactRemaining({ ...s, exact: { me: "60", a: "50" } })).toBe(-10);
  });

  it("needs an amount, a description, someone to split with, and exact shares that add up", () => {
    const ok = form({ amount: "100", description: "Taxi", participants: ["me", "a"] });
    expect(isExpenseFormValid(ok)).toBe(true);
    expect(isExpenseFormValid({ ...ok, amount: "0" })).toBe(false);
    expect(isExpenseFormValid({ ...ok, description: "   " })).toBe(false);
    expect(isExpenseFormValid({ ...ok, participants: [] })).toBe(false);
    expect(isExpenseFormValid({ ...ok, splitMode: "exact", exact: { me: "50", a: "40" } })).toBe(false);
    expect(isExpenseFormValid({ ...ok, splitMode: "exact", exact: { me: "50", a: "50" } })).toBe(true);
  });

  it("reads blank or junk amounts as zero", () => {
    expect(parseAmount("")).toBe(0);
    expect(parseAmount("12.5")).toBe(12.5);
  });
});

describe("expensePayload", () => {
  const s = form({ amount: "90", description: "  Taxi  ", participants: ["me", "a"], notes: "  ", date: NOW });

  it("trims text, drops an empty note and computes the splits", () => {
    expect(expensePayload(s, null)).toEqual({
      groupId: null, description: "Taxi", amount: 90, category: "food", paidBy: "me",
      splits: [{ personId: "me", amount: 45 }, { personId: "a", amount: 45 }],
      date: NOW.toISOString(), notes: undefined, recurring: "none",
    });
  });

  it("repeats monthly, but keeps an existing weekly repeat weekly", () => {
    expect(expensePayload({ ...s, recurring: true }, null).recurring).toBe("monthly");
    expect(expensePayload({ ...s, recurring: true }, expense({ recurring: "weekly" })).recurring).toBe("weekly");
    expect(expensePayload({ ...s, recurring: false }, expense({ recurring: "weekly" })).recurring).toBe("none");
  });
});
