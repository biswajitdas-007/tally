import { lastOccurrence, periodKey } from "./recurring";
import type { RecurFreq } from "./types";

/** The day a repeating expense recurs on: its own day of the month, or weekday. */
export const repeatDay = (freq: RecurFreq, date: Date): number =>
  freq === "monthly" ? date.getDate() : date.getDay();

/**
 * The period a repeating expense already covers when it has no stamp yet: its
 * own period, or the period it was set to repeat in if that's later. Without
 * the second, an expense back-dated to May and set to repeat in November would
 * replay every month in between.
 */
export function repeatBaseline(freq: RecurFreq, date: Date, since: Date): string {
  const day = repeatDay(freq, date);
  const own = periodKey(freq, lastOccurrence(freq, day, date));
  if (Number.isNaN(since.getTime())) return own;
  const start = periodKey(freq, lastOccurrence(freq, day, since));
  return own > start ? own : start;
}
