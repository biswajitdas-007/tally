import { describe, expect, it } from "vitest";
import { groupByDay, recentActivity } from "./activity";
import type { Expense } from "./types";

const E = (o: Partial<Expense>): Expense =>
  ({ id: "x", groupId: null, description: "", amount: 0, category: "food",
     paidBy: "me", splits: [], date: "", createdBy: "me", createdAt: "", ...o }) as Expense;

const exp = [
  E({ id: "e1", date: "2026-07-05T00:00:00Z" }),
  E({ id: "s1", date: "2026-07-06T00:00:00Z", isSettlement: true }),
  E({ id: "e2", date: "2026-07-01T00:00:00Z" }),
];

describe("recentActivity", () => {
  it("lists splits and settlements newest first", () => {
    expect(recentActivity(exp, 10).map((e) => e.id)).toEqual(["s1", "e1", "e2"]);
  });

  it("respects the limit, leaves the input untouched and copes with nothing", () => {
    expect(recentActivity(exp, 2).map((e) => e.id)).toEqual(["s1", "e1"]);
    expect(exp.map((e) => e.id)).toEqual(["e1", "s1", "e2"]);
    expect(recentActivity([], 5)).toHaveLength(0);
  });
});

describe("groupByDay", () => {
  // Local-time dates so the buckets don't depend on the machine's timezone.
  const at = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h).toISOString();
  const now = new Date(2026, 10, 28, 18);

  it("buckets by local day, newest first, with friendly labels", () => {
    const days = groupByDay(
      [
        E({ id: "old", date: at(2025, 12, 31) }),
        E({ id: "today-am", date: at(2026, 11, 28, 9) }),
        E({ id: "yday", date: at(2026, 11, 27) }),
        E({ id: "today-pm", date: at(2026, 11, 28, 17) }),
        E({ id: "earlier", date: at(2026, 11, 20) }),
      ],
      now,
    );
    expect(days.map((d) => d.label)).toEqual(["Today", "Yesterday", "20 Nov", "31 Dec 2025"]);
    expect(days[0].items.map((e) => e.id)).toEqual(["today-pm", "today-am"]);
    expect(days[0].key).toBe("2026-11-28");
  });

  it("copes with nothing", () => {
    expect(groupByDay([], now)).toEqual([]);
  });
});
