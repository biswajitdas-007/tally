/**
 * A small RFC 4180 CSV reader. Bank exports are messy — quoted fields with
 * commas inside, stray blank lines, a UTF-8 BOM from Excel, semicolons or tabs
 * instead of commas — so we parse properly rather than splitting on commas.
 */

/** Statement exports are small; anything larger is a mistake or a different file. */
export const MAX_FILE_BYTES = 2 * 1024 * 1024; // 2 MB
/** Enough for years of transactions, small enough to import in one request. */
export const MAX_ROWS = 2000;

export type Delimiter = "," | ";" | "\t" | "|";
const CANDIDATES: Delimiter[] = [",", ";", "\t", "|"];

/** Strip a UTF-8 byte-order mark, which Excel loves to add. */
const stripBom = (s: string) => (s.charCodeAt(0) === 0xfeff ? s.slice(1) : s);

/**
 * Guess the delimiter by which one yields the most consistent column count
 * across the first few lines — more reliable than just counting occurrences,
 * since narration text is full of commas.
 */
export function detectDelimiter(text: string): Delimiter {
  const sample = stripBom(text).split(/\r?\n/).filter((l) => l.trim()).slice(0, 10);
  if (!sample.length) return ",";

  let best: Delimiter = ",";
  let bestScore = -1;
  for (const d of CANDIDATES) {
    const counts = sample.map((l) => parseLine(l, d).length);
    const cols = counts[0] ?? 1;
    if (cols < 2) continue;
    const consistent = counts.filter((c) => c === cols).length;
    const score = consistent * 10 + cols;
    if (score > bestScore) {
      bestScore = score;
      best = d;
    }
  }
  return best;
}

/** Split one line, honouring quotes and doubled-quote escapes. */
function parseLine(line: string, delim: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else quoted = false;
      } else cur += ch;
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === delim) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out.map((c) => c.trim());
}

export interface ParsedCsv {
  rows: string[][];
  delimiter: Delimiter;
  /** Rows dropped because they were blank. */
  skippedBlank: number;
  /** True when the file had more rows than we allow. */
  truncated: boolean;
}

/**
 * Parse the whole file. Handles newlines inside quoted fields, which is why
 * this walks characters rather than splitting on line breaks first.
 */
export function parseCsv(text: string, delimiter?: Delimiter): ParsedCsv {
  const src = stripBom(text);
  const delim = delimiter ?? detectDelimiter(src);

  const rows: string[][] = [];
  let cur = "";
  let row: string[] = [];
  let quoted = false;
  let skippedBlank = 0;

  const pushCell = () => {
    row.push(cur.trim());
    cur = "";
  };
  const pushRow = () => {
    pushCell();
    if (row.every((c) => c === "")) skippedBlank++;
    else rows.push(row);
    row = [];
  };

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          cur += '"';
          i++;
        } else quoted = false;
      } else cur += ch;
      continue;
    }
    if (ch === '"') quoted = true;
    else if (ch === delim) pushCell();
    else if (ch === "\r") continue;
    else if (ch === "\n") pushRow();
    else cur += ch;
  }
  if (cur !== "" || row.length) pushRow();

  const truncated = rows.length > MAX_ROWS + 1; // +1 for the header
  return {
    rows: truncated ? rows.slice(0, MAX_ROWS + 1) : rows,
    delimiter: delim,
    skippedBlank,
    truncated,
  };
}
