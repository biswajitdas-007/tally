import type { FinanceEntry, FinanceType, ID } from "./types";
import { guessCategory } from "./categorise";

/* ---------- column detection ---------- */

export type ColumnRole = "date" | "description" | "amount" | "debit" | "credit" | "ignore";

/** Header words we recognise, in the order we prefer to match them. */
const HEADER_HINTS: [ColumnRole, RegExp][] = [
  ["date", /^(txn|transaction|value|posting|tran)?\s*(date|dt)\b|^date$/i],
  ["debit", /withdraw|debit|dr\b|paid out|money out/i],
  ["credit", /deposit|credit|cr\b|paid in|money in/i],
  ["description", /narration|description|particulars|details|remarks|transaction remarks|payee|reference/i],
  ["amount", /^amount$|^amt|transaction amount/i],
];

/** A balance column looks like an amount but must never be imported. */
const BALANCE = /balance|closing bal|running bal/i;

export function detectColumns(header: string[], sample: string[][]): ColumnRole[] {
  const roles: ColumnRole[] = header.map(() => "ignore");
  const taken = new Set<ColumnRole>();

  header.forEach((h, i) => {
    if (BALANCE.test(h)) return; // stays ignored
    for (const [role, re] of HEADER_HINTS) {
      if (taken.has(role)) continue;
      if (re.test(h)) {
        roles[i] = role;
        taken.add(role);
        return;
      }
    }
  });

  // No usable header? Fall back to what the data looks like.
  if (!taken.has("date")) {
    const i = header.findIndex((_, c) => sample.some((r) => parseDate(r[c] ?? "") !== null));
    if (i >= 0) {
      roles[i] = "date";
      taken.add("date");
    }
  }
  if (!taken.has("amount") && !taken.has("debit") && !taken.has("credit")) {
    const i = header.findIndex(
      (h, c) => !BALANCE.test(h) && roles[c] === "ignore" && sample.some((r) => parseAmount(r[c] ?? "") !== null),
    );
    if (i >= 0) {
      roles[i] = "amount";
      taken.add("amount");
    }
  }
  if (!taken.has("description")) {
    // The widest remaining text column is almost always the narration.
    let best = -1;
    let bestLen = 0;
    header.forEach((_, c) => {
      if (roles[c] !== "ignore") return;
      const len = sample.reduce((a, r) => a + (r[c]?.length ?? 0), 0);
      if (len > bestLen) {
        bestLen = len;
        best = c;
      }
    });
    if (best >= 0 && bestLen > 0) roles[best] = "description";
  }
  return roles;
}

/* ---------- value parsing ---------- */

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

/**
 * Parse the date formats Indian bank exports actually use. Day-first is
 * assumed for ambiguous slash dates, since that's the convention here —
 * `preferMonthFirst` flips it when a file proves otherwise.
 */
export function parseDate(raw: string, preferMonthFirst = false): Date | null {
  const s = raw.trim();
  if (!s) return null;

  // 2026-01-31 / 2026/01/31
  let m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (m) return valid(+m[1], +m[2] - 1, +m[3]);

  // 31-01-2026 / 31/01/26 / 01.31.2026
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
  if (m) {
    const a = +m[1];
    const b = +m[2];
    const year = fullYear(+m[3]);
    // If one of them can't be a month, that settles it.
    if (a > 12) return valid(year, b - 1, a);
    if (b > 12) return valid(year, a - 1, b);
    return preferMonthFirst ? valid(year, a - 1, b) : valid(year, b - 1, a);
  }

  // 31 Jan 2026 / 31-Jan-26 / Jan 31, 2026
  m = s.match(/^(\d{1,2})[-\s]*([A-Za-z]{3,})[-\s]*(\d{2,4})/);
  if (m) {
    const mo = MONTHS[m[2].slice(0, 3).toLowerCase()];
    if (mo !== undefined) return valid(fullYear(+m[3]), mo, +m[1]);
  }
  m = s.match(/^([A-Za-z]{3,})[-\s]+(\d{1,2}),?[-\s]+(\d{2,4})/);
  if (m) {
    const mo = MONTHS[m[1].slice(0, 3).toLowerCase()];
    if (mo !== undefined) return valid(fullYear(+m[3]), mo, +m[2]);
  }
  return null;
}

const fullYear = (y: number) => (y < 100 ? (y > 70 ? 1900 + y : 2000 + y) : y);

function valid(y: number, mo: number, d: number): Date | null {
  if (mo < 0 || mo > 11 || d < 1 || d > 31) return null;
  const dt = new Date(y, mo, d);
  return dt.getFullYear() === y && dt.getMonth() === mo && dt.getDate() === d ? dt : null;
}

/**
 * Does this file use month-first dates? Only true when some row is
 * unambiguously month-first (first part > 12) and none is day-first.
 */
export function usesMonthFirst(values: string[]): boolean {
  let monthFirst = false;
  for (const v of values) {
    const m = v.trim().match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
    if (!m) continue;
    if (+m[1] > 12) return false; // day-first proven
    if (+m[2] > 12) monthFirst = true;
  }
  return monthFirst;
}

/**
 * Parse an amount. Copes with ₹ and currency codes, thousands separators
 * (including the Indian 1,23,456 grouping), trailing/leading minus,
 * accounting parentheses, and Cr/Dr suffixes.
 */
export function parseAmount(raw: string): number | null {
  let s = raw.trim();
  if (!s) return null;

  let sign = 1;
  if (/^\(.*\)$/.test(s)) {
    sign = -1;
    s = s.slice(1, -1);
  }
  if (/\bdr\b|\bdebit\b/i.test(s)) sign = -1;
  const isCredit = /\bcr\b|\bcredit\b/i.test(s);

  s = s.replace(/(inr|rs\.?|₹)/gi, "").replace(/\b(cr|dr|credit|debit)\b/gi, "").trim();
  if (s.endsWith("-")) {
    sign = -1;
    s = s.slice(0, -1);
  }
  if (s.startsWith("-")) {
    sign = -1;
    s = s.slice(1);
  }
  if (s.startsWith("+")) s = s.slice(1);

  s = s.replace(/,/g, "").replace(/\s/g, "");
  if (!/^\d*\.?\d+$/.test(s)) return null;

  const n = parseFloat(s);
  if (!Number.isFinite(n)) return null;
  return isCredit ? Math.abs(n) : sign * n;
}

/* ---------- rows -> draft entries ---------- */

export type RowProblem = "no-date" | "no-amount" | "zero-amount";

export interface DraftEntry {
  /** Index of the source row, so the review list can point at it. */
  row: number;
  date: Date | null;
  description: string;
  amount: number;
  type: FinanceType;
  category: string;
  /** Matches something already in Tally. */
  duplicate: boolean;
  /** Matches an earlier row in this same file. */
  repeatInFile: boolean;
  problem: RowProblem | null;
  /** Whether it'll be imported — duplicates and problems default to off. */
  include: boolean;
  /** Stable fingerprint, stored so a re-import of the same file is caught exactly. */
  key: string;
}

export const importKey = (date: Date, amount: number, type: FinanceType, description: string): string =>
  [
    date.toISOString().slice(0, 10),
    Math.round(Math.abs(amount) * 100),
    type,
    description.toLowerCase().replace(/\s+/g, " ").trim().slice(0, 60),
  ].join("|");

/** Same day, same amount, same direction — near enough to be a duplicate. */
const looseKey = (dateIso: string, amount: number, type: FinanceType) =>
  [dateIso.slice(0, 10), Math.round(Math.abs(amount) * 100), type].join("|");

export interface BuildOptions {
  rows: string[][];
  roles: ColumnRole[];
  hasHeader: boolean;
  existing: FinanceEntry[];
  monthFirst?: boolean;
}

export function buildDrafts({ rows, roles, hasHeader, existing, monthFirst = false }: BuildOptions): DraftEntry[] {
  const body = hasHeader ? rows.slice(1) : rows;

  // Everything already in Tally, by both an exact key and a loose one.
  const exact = new Set<string>();
  const loose = new Set<string>();
  for (const e of existing) {
    if (e.transfer) continue;
    if (e.importKey) exact.add(e.importKey);
    exact.add(importKey(new Date(e.date), e.amount, e.type, e.note ?? ""));
    loose.add(looseKey(e.date, e.amount, e.type));
  }

  const seenInFile = new Set<string>();
  const col = (role: ColumnRole) => roles.indexOf(role);
  const iDate = col("date");
  const iDesc = col("description");
  const iAmt = col("amount");
  const iDeb = col("debit");
  const iCred = col("credit");

  return body.map((r, i) => {
    const date = iDate >= 0 ? parseDate(r[iDate] ?? "", monthFirst) : null;
    const description = (iDesc >= 0 ? r[iDesc] ?? "" : "").replace(/\s+/g, " ").trim();

    // Debit/credit columns win when present — that's how most bank exports
    // express direction, and it's unambiguous.
    let amount: number | null = null;
    if (iDeb >= 0 || iCred >= 0) {
      const d = iDeb >= 0 ? parseAmount(r[iDeb] ?? "") : null;
      const c = iCred >= 0 ? parseAmount(r[iCred] ?? "") : null;
      if (d && Math.abs(d) > 0) amount = -Math.abs(d);
      else if (c && Math.abs(c) > 0) amount = Math.abs(c);
      else amount = 0;
    } else if (iAmt >= 0) {
      amount = parseAmount(r[iAmt] ?? "");
    }

    let problem: RowProblem | null = null;
    if (!date) problem = "no-date";
    else if (amount === null) problem = "no-amount";
    else if (Math.abs(amount) < 0.005) problem = "zero-amount";

    const amt = Math.abs(amount ?? 0);
    const type: FinanceType = (amount ?? 0) >= 0 ? "income" : "expense";
    const key = date ? importKey(date, amt, type, description) : `row-${i}`;

    const duplicate = Boolean(date) && (exact.has(key) || loose.has(looseKey(date!.toISOString(), amt, type)));
    const repeatInFile = seenInFile.has(key);
    if (date) seenInFile.add(key);

    return {
      row: i + (hasHeader ? 2 : 1), // 1-based line number in the file
      date,
      description,
      amount: amt,
      type,
      category: guessCategory(description, type),
      duplicate,
      repeatInFile,
      problem,
      include: !problem && !duplicate && !repeatInFile,
      key,
    };
  });
}

export interface ImportSummary {
  total: number;
  ready: number;
  duplicates: number;
  repeats: number;
  problems: number;
  income: number;
  expense: number;
  incomeTotal: number;
  expenseTotal: number;
}

export function summarise(drafts: DraftEntry[]): ImportSummary {
  const on = drafts.filter((d) => d.include);
  return {
    total: drafts.length,
    ready: on.length,
    duplicates: drafts.filter((d) => d.duplicate).length,
    repeats: drafts.filter((d) => d.repeatInFile && !d.duplicate).length,
    problems: drafts.filter((d) => d.problem).length,
    income: on.filter((d) => d.type === "income").length,
    expense: on.filter((d) => d.type === "expense").length,
    incomeTotal: on.filter((d) => d.type === "income").reduce((a, d) => a + d.amount, 0),
    expenseTotal: on.filter((d) => d.type === "expense").reduce((a, d) => a + d.amount, 0),
  };
}

/** Turn the chosen drafts into entries ready for the API. */
export function toEntries(drafts: DraftEntry[], accountId: ID | null): Record<string, unknown>[] {
  return drafts
    .filter((d) => d.include && d.date)
    .map((d) => ({
      type: d.type,
      amount: d.amount,
      category: d.category,
      date: d.date!.toISOString(),
      note: d.description || undefined,
      accountId: accountId ?? undefined,
      importKey: d.key,
    }));
}
