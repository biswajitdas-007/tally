import type { Liability } from "./types";

export const DEFAULT_DUE_DAY = 3;

const clampDay = (d: number) => Math.min(Math.max(Math.round(d), 1), 28);
const ym = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

/** EMIs still to pay = total − paid. */
export const remainingOf = (l: Liability): number => Math.max(0, (l.termMonths ?? 0) - (l.emisPaid ?? 0));

/**
 * Month keys (YYYY-MM) strictly after `lastPaidMonth`, up to the current month,
 * whose due date has already passed. `lastPaidMonth` stamps the month last
 * counted — whether by the auto-job or a manual update — so nothing is counted
 * twice. If it's unset we can't safely catch up, so return none.
 */
function dueMonths(lastPaidMonth: string | undefined, dueDay: number, now: Date): string[] {
  if (!lastPaidMonth) return [];
  const [ly, lm] = lastPaidMonth.split("-").map(Number);
  if (!ly || !lm) return [];
  const day = clampDay(dueDay);
  const curFirst = new Date(now.getFullYear(), now.getMonth(), 1);

  const out: string[] = [];
  let d = new Date(ly, lm, 1); // lm is 1-based ⇒ this is the month AFTER lastPaidMonth
  while (d <= curFirst) {
    if (new Date(d.getFullYear(), d.getMonth(), day) <= now) out.push(ym(d));
    d = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  }
  return out;
}

/** Months whose EMI is due but not yet counted (capped at what's left to pay). */
export function pendingEmis(l: Liability, now = new Date()): string[] {
  if (!l.emi || !l.termMonths) return [];
  const left = remainingOf(l);
  if (left <= 0) return [];
  return dueMonths(l.lastPaidMonth, l.dueDay ?? DEFAULT_DUE_DAY, now).slice(0, left);
}

function apply(l: Liability, months: string[], now: Date): Liability {
  const emi = l.emi ?? 0;
  return {
    ...l,
    emisPaid: (l.emisPaid ?? 0) + months.length,
    outstanding: Math.max(0, Math.round((l.outstanding - emi * months.length) * 100) / 100),
    lastPaidMonth: months[months.length - 1] ?? ym(now),
  };
}

/** Auto-debit only: count any due EMIs. Returns the updated loan + months applied. */
export function applyAuto(l: Liability, now = new Date()): { liability: Liability; applied: string[] } {
  if (!l.autoDebit) return { liability: l, applied: [] };
  const due = pendingEmis(l, now);
  if (due.length === 0) return { liability: l, applied: [] };
  return { liability: apply(l, due, now), applied: due };
}

/** Manual loans with an EMI due but not yet confirmed this month. */
export function manualDue(l: Liability, now = new Date()): boolean {
  return !l.autoDebit && pendingEmis(l, now).length > 0;
}

/** Mark a manual loan's due EMI(s) paid after the user confirms. */
export function markManualPaid(l: Liability, now = new Date()): Liability {
  const due = pendingEmis(l, now);
  const months = due.length ? due : [ym(now)];
  return apply(l, months, now);
}

/** Stamp so the current month won't be counted again (used when the user edits the count). */
export const stampNow = (now = new Date()): string => ym(now);
