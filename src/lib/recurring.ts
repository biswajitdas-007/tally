import type { Recurring, RecurFreq } from "./types";

export const DEFAULT_RECUR_DAY = 1;
/** Never catch up more than a year's worth if the job was down for a long time. */
const MAX_CATCHUP = 12;

const pad = (n: number) => String(n).padStart(2, "0");
const clampDom = (d: number) => Math.min(Math.max(Math.round(d), 1), 28);
const clampDow = (d: number) => Math.min(Math.max(Math.round(d), 0), 6);

const ym = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** The key stamped on a rule once a given occurrence has been generated. */
export const periodKey = (freq: RecurFreq, d: Date): string => (freq === "monthly" ? ym(d) : ymd(d));

/** The most recent occurrence of this rule on or before `now`. */
export function lastOccurrence(freq: RecurFreq, day: number, now: Date): Date {
  if (freq === "monthly") {
    const dom = clampDom(day);
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), dom);
    return thisMonth <= now ? thisMonth : new Date(now.getFullYear(), now.getMonth() - 1, dom);
  }
  const dow = clampDow(day);
  const back = (now.getDay() - dow + 7) % 7;
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - back);
}

/** When this rule fires next (used to tell the user what's coming). */
export function nextOccurrence(freq: RecurFreq, day: number, now = new Date()): Date {
  const last = lastOccurrence(freq, day, now);
  if (freq === "monthly") return new Date(last.getFullYear(), last.getMonth() + 1, last.getDate());
  return new Date(last.getFullYear(), last.getMonth(), last.getDate() + 7);
}

/**
 * Occurrences that have come due but haven't been generated yet, oldest first.
 * `lastRun` stamps the period last generated, so nothing is created twice; if
 * it's unset we can't safely catch up and return none.
 */
export function duePeriods(r: Recurring, now = new Date()): { key: string; date: Date }[] {
  if (r.paused || !r.lastRun) return [];
  const out: { key: string; date: Date }[] = [];
  let cursor = lastOccurrence(r.freq, r.day, now);

  // Walk back from the latest due occurrence until we reach what's already done.
  while (out.length < MAX_CATCHUP) {
    const key = periodKey(r.freq, cursor);
    if (key <= r.lastRun) break;
    out.unshift({ key, date: new Date(cursor) });
    cursor =
      r.freq === "monthly"
        ? new Date(cursor.getFullYear(), cursor.getMonth() - 1, cursor.getDate())
        : new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() - 7);
  }
  return out;
}

/** True when the rule has something waiting to be added. */
export const isDue = (r: Recurring, now = new Date()): boolean => duePeriods(r, now).length > 0;

/** Stamp the current period so a brand-new rule doesn't fire for one already past. */
export const stampCurrent = (freq: RecurFreq, day: number, now = new Date()): string =>
  periodKey(freq, lastOccurrence(freq, day, now));

function ordinal(n: number): string {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  const suffix = v % 10 === 1 ? "st" : v % 10 === 2 ? "nd" : v % 10 === 3 ? "rd" : "th";
  return `${n}${suffix}`;
}

/** "Monthly on the 1st" / "Weekly on Monday" */
export function recurLabel(r: Pick<Recurring, "freq" | "day">): string {
  return r.freq === "monthly"
    ? `Monthly on the ${ordinal(clampDom(r.day))}`
    : `Weekly on ${WEEKDAYS[clampDow(r.day)]}`;
}

/** Total per month a set of rules moves, for a quick "committed" figure. */
export function monthlyTotal(rules: Recurring[], type: Recurring["type"]): number {
  return rules
    .filter((r) => !r.paused && r.type === type)
    .reduce((a, r) => a + (r.freq === "monthly" ? r.amount : r.amount * (52 / 12)), 0);
}
