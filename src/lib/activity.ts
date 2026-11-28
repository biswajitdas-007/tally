import type { Expense } from "./types";

/** Split expenses and settlements, newest first. */
export function recentActivity(expenses: Expense[], limit = 8): Expense[] {
  return [...expenses].sort((a, b) => +new Date(b.date) - +new Date(a.date)).slice(0, limit);
}

export interface DayGroup {
  /** Local calendar day, `YYYY-MM-DD`. */
  key: string;
  /** "Today", "Yesterday" or a short date (with the year when it isn't this year). */
  label: string;
  items: Expense[];
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function dayLabel(d: Date, now: Date): string {
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  if (dayKey(d) === dayKey(now)) return "Today";
  if (dayKey(d) === dayKey(yesterday)) return "Yesterday";
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    ...(d.getFullYear() === now.getFullYear() ? {} : { year: "numeric" }),
  });
}

/** Expenses bucketed by local day, newest day first and newest first within a day. */
export function groupByDay(expenses: Expense[], now: Date = new Date()): DayGroup[] {
  const groups = new Map<string, DayGroup>();
  for (const e of recentActivity(expenses, expenses.length)) {
    const d = new Date(e.date);
    const key = dayKey(d);
    let group = groups.get(key);
    if (!group) {
      group = { key, label: dayLabel(d, now), items: [] };
      groups.set(key, group);
    }
    group.items.push(e);
  }
  return [...groups.values()];
}
