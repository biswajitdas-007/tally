import { parseCsv, looksTabular, MAX_FILE_BYTES, MAX_ROWS, type Delimiter } from "./csv";
import { readXlsx } from "./xlsx";
import { readPdfTable, keepTableRows, PasswordProtectedError, MAX_PDF_PAGES } from "./pdf-table";

export type SourceKind = "csv" | "xlsx" | "pdf";

export interface ReadResult {
  kind: SourceKind;
  rows: string[][];
  /** How the file was split, when that's meaningful to show. */
  delimiter?: Delimiter;
  /** Sheet names found, when there's more than one. */
  sheets?: string[];
  sheetIndex?: number;
  notices: string[];
  truncated: boolean;
}

export class ImportError extends Error {}

const EXT = /\.(csv|txt|tsv|xlsx|xlsm|pdf)$/i;

export function kindOf(name: string): SourceKind | null {
  const m = name.match(EXT);
  if (!m) return null;
  const ext = m[1].toLowerCase();
  if (ext === "pdf") return "pdf";
  if (ext === "xlsx" || ext === "xlsm") return "xlsx";
  return "csv";
}

function cap(rows: string[][], notices: string[]): { rows: string[][]; truncated: boolean } {
  if (rows.length <= MAX_ROWS + 1) return { rows, truncated: false };
  notices.push(`Only the first ${MAX_ROWS.toLocaleString("en-IN")} rows were read.`);
  return { rows: rows.slice(0, MAX_ROWS + 1), truncated: true };
}

/**
 * Read whichever kind of statement the user picked and hand back plain rows.
 * Everything downstream — column mapping, duplicate checks, the review list —
 * is shared, so a PDF is reviewed exactly like a CSV.
 */
export async function readStatement(file: File, sheetIndex = 0): Promise<ReadResult> {
  const kind = kindOf(file.name);
  if (!kind) {
    throw new ImportError("Tally reads CSV, Excel and PDF statements. Export yours in one of those and try again.");
  }
  if (file.size === 0) throw new ImportError("That file is empty.");
  if (file.size > MAX_FILE_BYTES) {
    throw new ImportError(
      `That file is ${(file.size / 1024 / 1024).toFixed(1)} MB — the limit is ${MAX_FILE_BYTES / 1024 / 1024} MB. Export a shorter date range and import it in a couple of goes.`,
    );
  }

  const notices: string[] = [];

  if (kind === "pdf") {
    let table;
    try {
      table = await readPdfTable(await file.arrayBuffer());
    } catch (err) {
      if (err instanceof PasswordProtectedError) {
        throw new ImportError(
          "That PDF is password-protected. Open it, remove the password (Print → Save as PDF works), then try again.",
        );
      }
      throw new ImportError("Couldn't read that PDF. If it's a scan rather than a real statement, there's no text to pull out.");
    }
    if (table.truncated) notices.push(`Only the first ${MAX_PDF_PAGES} pages were read.`);

    const rows = keepTableRows(table.rows);
    if (!rows.length) {
      throw new ImportError(
        "No transactions found in that PDF. Scanned or image-only statements have no text to read — ask your bank for a CSV or Excel export.",
      );
    }
    const capped = cap(rows, notices);
    return { kind, rows: capped.rows, notices, truncated: capped.truncated };
  }

  if (kind === "xlsx") {
    let sheets;
    try {
      sheets = readXlsx(await file.arrayBuffer());
    } catch {
      throw new ImportError("Couldn't read that spreadsheet. If it's an older .xls, open it and save as .xlsx or CSV.");
    }
    if (!sheets.length) throw new ImportError("That spreadsheet has no data in it.");

    const pick = sheets[Math.min(sheetIndex, sheets.length - 1)];
    if (!looksTabular(pick.rows)) {
      throw new ImportError(`"${pick.name}" doesn't look like a table of transactions. Try another sheet.`);
    }
    const capped = cap(pick.rows, notices);
    return {
      kind,
      rows: capped.rows,
      sheets: sheets.map((s) => s.name),
      sheetIndex: Math.min(sheetIndex, sheets.length - 1),
      notices,
      truncated: capped.truncated,
    };
  }

  // CSV / TXT / TSV
  let text: string;
  try {
    text = await file.text();
  } catch {
    throw new ImportError("Couldn't read that file. Try re-exporting it from your bank.");
  }
  const parsed = parseCsv(text);
  if (!parsed.rows.length) throw new ImportError("There's nothing in that file.");
  if (!looksTabular(parsed.rows)) {
    throw new ImportError(
      "That file isn't laid out as a table, so there's nothing to import. A statement export should have one transaction per line with columns for date, description and amount.",
    );
  }
  if (parsed.rows.length < 2) throw new ImportError("That file has a header but no transactions.");
  if (parsed.truncated) notices.push(`Only the first ${MAX_ROWS.toLocaleString("en-IN")} rows were read.`);
  if (parsed.skippedBlank > 0) {
    notices.push(`${parsed.skippedBlank} blank ${parsed.skippedBlank === 1 ? "row" : "rows"} skipped.`);
  }

  return { kind, rows: parsed.rows, delimiter: parsed.delimiter, notices, truncated: parsed.truncated };
}
