import type { Expense, FinanceEntry, ID } from "./types";

export type ActivityItem =
  | { kind: "split"; id: ID; date: string; expense: Expense }
  | { kind: "money"; id: ID; date: string; entry: FinanceEntry };

/**
 * One feed for everything that moved money, newest first.
 *
 * Someone tracking their own finances doesn't think of "my expenses" and "the
 * group's expenses" as separate streams — a coffee they bought and a dinner
 * they split are both just things that happened. Internal transfers (parking
 * money between your own accounts) are left out; nothing actually moved.
 */
export function recentActivity(
  expenses: Expense[],
  finance: FinanceEntry[],
  limit = 8,
  includeMoney = true,
): ActivityItem[] {
  const items: ActivityItem[] = expenses.map((e) => ({ kind: "split", id: e.id, date: e.date, expense: e }));

  if (includeMoney) {
    for (const f of finance) {
      if (f.transfer) continue;
      items.push({ kind: "money", id: f.id, date: f.date, entry: f });
    }
  }

  return items.sort((a, b) => +new Date(b.date) - +new Date(a.date)).slice(0, limit);
}
