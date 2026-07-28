/**
 * Pull a table out of a PDF bank statement.
 *
 * A PDF has no rows or columns — only glyphs at coordinates. So we take every
 * text item with its position, group items sharing a baseline into lines, then
 * split each line into cells wherever there's a horizontal gap. That recovers
 * the table well enough for the same column-mapping and review screen the CSV
 * path uses, and the user corrects anything we got wrong.
 */

export class PasswordProtectedError extends Error {
  constructor() {
    super("password-protected");
    this.name = "PasswordProtectedError";
  }
}

export const MAX_PDF_PAGES = 60;

interface Item {
  text: string;
  x: number;
  y: number;
  w: number;
}

interface Cell {
  text: string;
  x0: number;
  x1: number;
}

/** Items whose baselines are within this many points count as one line. */
const LINE_TOLERANCE = 2.5;
/** A gap wider than this fraction of the mean character width starts a new cell. */
const GAP_RATIO = 1.6;
const MIN_GAP = 4;

export interface PdfTable {
  rows: string[][];
  pages: number;
  /** True when we stopped early because the document was very long. */
  truncated: boolean;
}

export async function readPdfTable(buf: ArrayBuffer): Promise<PdfTable> {
  // Loaded on demand — no reason for everyone to carry a PDF engine.
  // The legacy build is transpiled for a wider baseline: the modern one needs
  // Promise.try and Uint8Array.toHex, which older Android browsers don't have.
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  // pdf.js always needs a worker; pointing at the bundled copy keeps it on our
  // own origin, which is what the CSP's script-src/worker-src 'self' allows.
  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
      import.meta.url,
    ).toString();
  }

  const task = pdfjs.getDocument({ data: new Uint8Array(buf), disableFontFace: true, useWorkerFetch: false });
  let doc;
  try {
    doc = await task.promise;
  } catch (err) {
    await task.destroy().catch(() => {});
    const name = (err as { name?: string })?.name;
    if (name === "PasswordException") throw new PasswordProtectedError();
    throw err;
  }

  const pageCount = doc.numPages;
  const pages = Math.min(pageCount, MAX_PDF_PAGES);
  const pageLines: Cell[][] = [];

  for (let p = 1; p <= pages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();

    const items: Item[] = [];
    for (const raw of content.items) {
      const it = raw as { str?: string; transform?: number[]; width?: number };
      const text = (it.str ?? "").trim();
      if (!text || !it.transform) continue;
      items.push({ text, x: it.transform[4], y: it.transform[5], w: it.width ?? text.length * 4 });
    }
    if (!items.length) continue;

    // Group by baseline, top of the page first.
    items.sort((a, b) => b.y - a.y || a.x - b.x);
    const lines: Item[][] = [];
    for (const it of items) {
      const last = lines[lines.length - 1];
      if (last && Math.abs(last[0].y - it.y) <= LINE_TOLERANCE) last.push(it);
      else lines.push([it]);
    }

    // Capture each line's cells with the horizontal span they occupy.
    const lineSpans: Cell[][] = [];
    for (const line of lines) {
      line.sort((a, b) => a.x - b.x);
      const avgChar =
        line.reduce((a, i) => a + i.w / Math.max(i.text.length, 1), 0) / Math.max(line.length, 1);
      const threshold = Math.max(avgChar * GAP_RATIO, MIN_GAP);

      const cells: Cell[] = [];
      let text = line[0].text;
      let x0 = line[0].x;
      let cursor = line[0].x + line[0].w;
      for (let i = 1; i < line.length; i++) {
        const it = line[i];
        if (it.x - cursor > threshold) {
          cells.push({ text: text.trim(), x0, x1: cursor });
          text = it.text;
          x0 = it.x;
        } else {
          // Same cell — keep a space unless the glyphs are touching.
          text += (it.x - cursor > 0.6 ? " " : "") + it.text;
        }
        cursor = it.x + it.w;
      }
      cells.push({ text: text.trim(), x0, x1: cursor });
      if (cells.some((c) => c.text !== "")) lineSpans.push(cells);
    }
    pageLines.push(...lineSpans);

    page.cleanup();
  }

  await task.destroy().catch(() => {});
  return { rows: alignToColumns(pageLines), pages, truncated: pageCount > pages };
}

/**
 * Snap cells onto shared columns.
 *
 * A blank cell leaves no glyph, so a row with an empty "Deposit" simply has
 * one fewer cell — which would silently shift every amount one column left and
 * turn a withdrawal into a deposit. So we derive column bands from where text
 * actually sits across the whole document, then place each cell in the band it
 * overlaps, leaving real gaps empty.
 */
export function alignToColumns(lines: Cell[][]): string[][] {
  if (!lines.length) return [];

  // Only rows of the most common width shape the bands — chrome lines are wide
  // single cells and would otherwise smear every column together.
  const widths = new Map<number, number>();
  for (const l of lines) widths.set(l.length, (widths.get(l.length) ?? 0) + 1);
  const common = [...widths.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0])[0][0];
  const shapers = lines.filter((l) => l.length === common && l.length > 1);
  if (!shapers.length) return lines.map((l) => l.map((c) => c.text));

  const spans = shapers.flat().map((c) => ({ x0: c.x0, x1: c.x1 })).sort((a, b) => a.x0 - b.x0);
  const bands: { x0: number; x1: number }[] = [];
  for (const sp of spans) {
    const last = bands[bands.length - 1];
    if (last && sp.x0 <= last.x1) last.x1 = Math.max(last.x1, sp.x1);
    else bands.push({ ...sp });
  }

  return lines.map((cells) => {
    const row = new Array<string>(bands.length).fill("");
    for (const c of cells) {
      let best = -1;
      let bestOverlap = 0;
      bands.forEach((b, i) => {
        const overlap = Math.min(c.x1, b.x1) - Math.max(c.x0, b.x0);
        if (overlap > bestOverlap) {
          bestOverlap = overlap;
          best = i;
        }
      });
      if (best < 0) continue;
      row[best] = row[best] ? `${row[best]} ${c.text}` : c.text;
    }
    // A line that matched nothing (page chrome) still deserves to come through.
    return row.some((v) => v !== "") ? row : cells.map((c) => c.text);
  });
}

/**
 * Statements carry a lot of chrome — addresses, page footers, summary boxes.
 * Keep the lines that look like table rows: several cells, one of which
 * contains something date-shaped.
 */
const HEADERISH = /date|narration|description|particulars|withdraw|deposit|debit|credit|balance|amount|remarks/i;

export function keepTableRows(rows: string[][]): string[][] {
  const dateish = /\b(\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}|\d{4}-\d{1,2}-\d{1,2}|\d{1,2}[-\s][A-Za-z]{3,}[-\s]\d{2,4})\b/;
  // Count cells that actually hold something: after column alignment a stray
  // header line like "Statement of account 01 Jul 2026 to 31 Jul 2026" is one
  // populated cell padded out to full width, and it carries a date.
  const filled = (r: string[]) => r.filter((c) => c.trim() !== "").length;
  const body = rows.filter((r) => filled(r) >= 3 && r.some((c) => dateish.test(c)));
  if (!body.length) return rows;

  // Keep the column headings when we can find them — real labels make the
  // mapping screen far easier to check than "Column 3".
  const headerIdx = rows.findIndex(
    (r) => filled(r) >= 3 && !r.some((c) => dateish.test(c)) && r.filter((c) => HEADERISH.test(c)).length >= 2,
  );
  const header = headerIdx >= 0 ? rows[headerIdx] : null;

  // Widest common shape wins — that's the transaction table rather than a
  // stray two-column summary line that happens to contain a date.
  const counts = new Map<number, number>();
  for (const r of body) counts.set(r.length, (counts.get(r.length) ?? 0) + 1);
  const common = [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0])[0][0];
  const kept = body.filter((r) => Math.abs(r.length - common) <= 1);
  const out = kept.length ? kept : body;
  return header ? [header, ...out] : out;
}
