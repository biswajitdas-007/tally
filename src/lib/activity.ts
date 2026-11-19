import type { Expense } from "./types";

/** Split expenses and settlements, newest first. */
export function recentActivity(expenses: Expense[], limit = 8): Expense[] {
  return [...expenses].sort((a, b) => +new Date(b.date) - +new Date(a.date)).slice(0, limit);
}
