import type { Liability } from "./types";

const clampDay = (d: number) => Math.min(Math.max(Math.round(d), 1), 28);

/** ISO date of the next payment strictly after `from`, for a given day-of-month. */
export function nextDueDate(dueDay: number, from = new Date()): string {
  const day = clampDay(dueDay);
  let d = new Date(from.getFullYear(), from.getMonth(), day);
  if (d <= from) d = new Date(from.getFullYear(), from.getMonth() + 1, day);
  return d.toISOString();
}

/**
 * Apply any auto-debit payments whose due date has passed — reduces the
 * outstanding by the EMI and the months-left by one, for each elapsed date
 * (so missed months are caught up). Pure: returns a new list + whether it
 * changed. Manual/partial payments are handled by editing the liability.
 */
export function catchUpLiabilities(liabilities: Liability[], now = new Date()): { list: Liability[]; changed: boolean } {
  let changed = false;
  const list = liabilities.map((l) => {
    if (!l.autoDebit || !l.nextDue || !l.emi || !l.remainingMonths || l.remainingMonths <= 0) return l;

    let outstanding = l.outstanding;
    let remaining = l.remainingMonths;
    let next = new Date(l.nextDue);
    let applied = false;

    while (next <= now && remaining > 0) {
      outstanding = Math.max(0, Math.round((outstanding - l.emi) * 100) / 100);
      remaining -= 1;
      next = new Date(next.getFullYear(), next.getMonth() + 1, next.getDate());
      applied = true;
    }
    if (!applied) return l;

    changed = true;
    return {
      ...l,
      outstanding,
      remainingMonths: remaining,
      nextDue: remaining > 0 ? next.toISOString() : undefined,
      autoDebit: remaining > 0 ? l.autoDebit : false,
    };
  });
  return { list, changed };
}
