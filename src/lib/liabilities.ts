import type { Expense, FinanceEntry, ID, Liability } from "./types";
import { linkedDelta } from "./accounts";
import { roundMoney } from "./utils";

export const DEFAULT_DUE_DAY = 3;
export const EMI_TIME_ZONE = "Asia/Kolkata";

interface CalendarDate {
  year: number;
  month: number;
  day: number;
}

export interface EmiNotice {
  key: string;
  period: string;
  kind: "upcoming" | "due";
  dueCount: number;
}

type ReminderAwareLiability = Liability & { lastEmiReminder?: string };
type LegacyLiability = Liability & { remainingMonths?: unknown };

const calendarFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: EMI_TIME_ZONE,
  calendar: "gregory",
  numberingSystem: "latn",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function normalizeLiability(liability: Liability): Liability {
  const legacy = liability as LegacyLiability;
  if (!("remainingMonths" in legacy)) return liability;
  const { remainingMonths, ...current } = legacy;
  if (
    current.emisPaid == null &&
    typeof current.termMonths === "number" &&
    Number.isFinite(current.termMonths) &&
    typeof remainingMonths === "number" &&
    Number.isFinite(remainingMonths)
  ) {
    return {
      ...current,
      emisPaid: Math.min(current.termMonths, Math.max(0, current.termMonths - remainingMonths)),
    };
  }
  return current;
}

const clampDay = (d: number) => Math.min(Math.max(Math.round(d), 1), 28);

function calendarDate(now: Date): CalendarDate {
  const values: Partial<Record<Intl.DateTimeFormatPartTypes, number>> = {};
  for (const part of calendarFormatter.formatToParts(now)) {
    if (part.type === "year" || part.type === "month" || part.type === "day") values[part.type] = Number(part.value);
  }
  return { year: values.year!, month: values.month!, day: values.day! };
}

const periodIndex = (date: Pick<CalendarDate, "year" | "month">): number => date.year * 12 + date.month - 1;
const periodFromIndex = (index: number): string => {
  const year = Math.floor(index / 12);
  const month = index - year * 12 + 1;
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}`;
};
const periodOf = (date: Pick<CalendarDate, "year" | "month">): string => periodFromIndex(periodIndex(date));
const parsePeriod = (value: string | undefined): number | null => {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(value ?? "");
  return match ? Number(match[1]) * 12 + Number(match[2]) - 1 : null;
};

function addCalendarDays(date: CalendarDate, days: number): CalendarDate {
  const next = new Date(Date.UTC(date.year, date.month - 1, date.day + days));
  return { year: next.getUTCFullYear(), month: next.getUTCMonth() + 1, day: next.getUTCDate() };
}

export const remainingOf = (l: Liability): number => Math.max(0, (l.termMonths ?? 0) - (l.emisPaid ?? 0));
const eligible = (l: Liability): boolean => {
  if (l.kind === "card") return l.dueDay != null;
  return (l.emi ?? 0) > 0 && (l.termMonths ?? 0) > 0 && remainingOf(l) > 0 && l.outstanding > 0;
};

function initialCursor(today: CalendarDate, dueDay: number): number {
  const current = periodIndex(today);
  return today.day > clampDay(dueDay) ? current : current - 1;
}

export function initialLastPaidMonth(dueDay = DEFAULT_DUE_DAY, now = new Date()): string {
  const today = calendarDate(now);
  return periodFromIndex(initialCursor(today, dueDay));
}

export function editedPaidCountLastPaidMonth(dueDay = DEFAULT_DUE_DAY, now = new Date()): string {
  const today = calendarDate(now);
  const current = periodIndex(today);
  return periodFromIndex(today.day >= clampDay(dueDay) ? current : current - 1);
}

function effectiveCursor(l: Liability, today: CalendarDate): number {
  const stored = parsePeriod(l.lastPaidMonth);
  if (stored != null) return stored;
  if (!l.autoDebit) return periodIndex(today) - 1;
  return initialCursor(today, l.dueDay ?? DEFAULT_DUE_DAY);
}

export function anchorLastPaidMonth(l: Liability, now = new Date()): string {
  return periodFromIndex(effectiveCursor(l, calendarDate(now)));
}

function duePeriods(l: Liability, today: CalendarDate, limit: number): string[] {
  const day = clampDay(l.dueDay ?? DEFAULT_DUE_DAY);
  const current = periodIndex(today);
  const latestDue = today.day >= day ? current : current - 1;
  const firstDue = effectiveCursor(l, today) + 1;
  const count = Math.min(limit, Math.max(0, latestDue - firstDue + 1));
  return Array.from({ length: count }, (_, i) => periodFromIndex(firstDue + i));
}

export function pendingEmis(l: Liability, now = new Date()): string[] {
  if (!eligible(l)) return [];
  const limit = l.kind === "card" ? 1 : remainingOf(l);
  return duePeriods(l, calendarDate(now), limit);
}

function apply(l: Liability, months: string[]): Liability {
  const emi = l.emi ?? 0;
  return {
    ...l,
    emisPaid: (l.emisPaid ?? 0) + months.length,
    outstanding: Math.max(0, roundMoney(l.outstanding - emi * months.length)),
    lastPaidMonth: months[months.length - 1],
  };
}

export function applyAuto(l: Liability, now = new Date()): { liability: Liability; applied: string[] } {
  if (!l.autoDebit) return { liability: l, applied: [] };
  const due = pendingEmis(l, now);
  if (due.length === 0) return { liability: l, applied: [] };
  return { liability: apply(l, due), applied: due };
}

export function manualDue(l: Liability, now = new Date()): boolean {
  return !l.autoDebit && pendingEmis(l, now).length > 0;
}

export function markManualPaid(l: Liability, now = new Date()): Liability {
  const due = pendingEmis(l, now);
  return due.length > 0 ? apply(l, due) : l;
}

export function emiNotice(l: Liability, now = new Date()): EmiNotice | null {
  if (!eligible(l)) return null;
  const today = calendarDate(now);
  const due = pendingEmis(l, now);
  const tomorrow = addCalendarDays(today, 1);
  const day = clampDay(l.dueDay ?? DEFAULT_DUE_DAY);
  const nextPeriod = periodOf(tomorrow);
  const upcoming = tomorrow.day === day && effectiveCursor(l, today) < periodIndex(tomorrow) && due.length < remainingOf(l);

  let notice: EmiNotice | null = null;
  if (upcoming) {
    notice = { key: `${l.id}:${nextPeriod}:upcoming`, period: nextPeriod, kind: "upcoming", dueCount: due.length + 1 };
  } else if (due.length > 0) {
    const period = due[due.length - 1];
    notice = { key: `${l.id}:${period}:due`, period, kind: "due", dueCount: due.length };
  }

  if (!notice) return null;
  const isSameNotice = (l as ReminderAwareLiability).lastEmiReminder === notice.key;
  if (!isSameNotice) return notice;

  // Smart backoff for due EMIs (every 3 days)
  if (notice.kind === "due" && l.lastEmiReminderDate) {
    const lastDate = new Date(l.lastEmiReminderDate);
    const diffTime = Math.abs(now.getTime() - lastDate.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays >= 3) return notice;
  }

  return null;
}

/** Stamp the current month in the India calendar. */
export const stampNow = (now = new Date()): string => periodOf(calendarDate(now));

export function liveLiabilityOutstanding(l: Liability, finance: FinanceEntry[], expenses: Expense[], meId: ID): number {
  return l.outstanding;
}
