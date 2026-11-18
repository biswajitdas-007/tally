import type { Recurring, RecurFreq } from "./types";
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
