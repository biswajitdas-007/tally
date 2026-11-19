/** Calendar-month helpers shared by Insights and its month picker. */

export function monthLabel(mKey: string): string {
  const [y, m] = mKey.split("-").map(Number);
  return new Date(y, m - 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

/** First of `d`'s month, never later than the current one — there's nothing to
 *  show in a month that hasn't happened. */
export function clampMonth(d: Date, now = new Date()): Date {
  const ceiling = new Date(now.getFullYear(), now.getMonth(), 1);
  const first = new Date(d.getFullYear(), d.getMonth(), 1);
  return first > ceiling ? ceiling : first;
}

/**
 * Reads a "YYYY-MM" URL parameter into the first of that month, so moving
 * between Insights and the report keeps the month you were looking at.
 * Anything unparseable falls back to the current month.
 */
export function monthFromParam(param: string | null | undefined, now = new Date()): Date {
  const match = param?.match(/^(\d{4})-(0[1-9]|1[0-2])$/);
  if (!match) return clampMonth(now, now);
  return clampMonth(new Date(Number(match[1]), Number(match[2]) - 1, 1), now);
}
