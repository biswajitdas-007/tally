import { unzipSync, strFromU8 } from "fflate";

/**
 * A minimal .xlsx reader.
 *
 * An xlsx is a zip of XML. We read the shared-string table, the number formats
 * (so date cells come out as dates rather than serial numbers), and the cells
 * of one sheet. Deliberately hand-rolled: the `xlsx` package on npm is frozen
 * at 0.18.5 with unfixed prototype-pollution and ReDoS advisories, and a
 * full-fat alternative is a lot of bundle for reading a statement.
 */

/** Built-in number formats that mean "this is a date". */
const BUILTIN_DATE_IDS = new Set([14, 15, 16, 17, 18, 19, 20, 21, 22, 27, 30, 36, 45, 46, 47, 50, 57]);

const decode = (s: string) =>
  s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/&amp;/g, "&");

/** Excel keeps dates as days since 1900, with a deliberate leap-year bug. */
function serialToDate(n: number): Date {
  return new Date(Math.round((n - 25569) * 86400000));
}

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;

/** Column letters ("AB") to a 0-based index. */
function colIndex(ref: string): number {
  const letters = ref.replace(/\d+/g, "");
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

function sharedStrings(xml: string | undefined): string[] {
  if (!xml) return [];
  const out: string[] = [];
  for (const si of xml.match(/<si>[\s\S]*?<\/si>/g) ?? []) {
    // A string can be split across runs; concatenate every <t> inside.
    const parts = [...si.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((m) => m[1]);
    out.push(decode(parts.join("")));
  }
  return out;
}

/** Style index → whether that style formats its number as a date. */
function dateStyles(xml: string | undefined): Set<number> {
  const out = new Set<number>();
  if (!xml) return out;

  const custom = new Map<number, string>();
  for (const m of xml.matchAll(/<numFmt[^>]*numFmtId="(\d+)"[^>]*formatCode="([^"]*)"/g)) {
    custom.set(Number(m[1]), decode(m[2]));
  }

  const block = xml.match(/<cellXfs[\s\S]*?<\/cellXfs>/)?.[0] ?? "";
  const xfs = block.match(/<xf[^>]*\/>|<xf[^>]*>[\s\S]*?<\/xf>/g) ?? [];
  xfs.forEach((xf, i) => {
    const id = Number(xf.match(/numFmtId="(\d+)"/)?.[1] ?? 0);
    if (BUILTIN_DATE_IDS.has(id)) {
      out.add(i);
      return;
    }
    const code = custom.get(id);
    // Strip quoted literals before looking for date tokens, so "Amount" in a
    // format string can't be mistaken for a month/day/year pattern.
    if (code && /[dmyh]/i.test(code.replace(/"[^"]*"/g, ""))) out.add(i);
  });
  return out;
}

export interface XlsxSheet {
  name: string;
  rows: string[][];
}

/** Every sheet that has any content, in workbook order. */
export function readXlsx(buf: ArrayBuffer): XlsxSheet[] {
  const files = unzipSync(new Uint8Array(buf));
  const read = (path: string) => (files[path] ? strFromU8(files[path]) : undefined);

  const strings = sharedStrings(read("xl/sharedStrings.xml"));
  const dates = dateStyles(read("xl/styles.xml"));

  // Sheet names in workbook order, matched to their file by r:id.
  const wb = read("xl/workbook.xml") ?? "";
  const rels = read("xl/_rels/workbook.xml.rels") ?? "";
  const relTarget = new Map<string, string>();
  for (const m of rels.matchAll(/<Relationship[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"/g)) {
    relTarget.set(m[1], m[2].replace(/^\/?xl\//, "").replace(/^\//, ""));
  }

  const sheets: XlsxSheet[] = [];
  const declared = [...wb.matchAll(/<sheet[^>]*name="([^"]*)"[^>]*r:id="([^"]+)"/g)];
  const paths = declared.length
    ? declared.map((m) => ({ name: decode(m[1]), path: `xl/${relTarget.get(m[2]) ?? ""}` }))
    : Object.keys(files)
        .filter((f) => /^xl\/worksheets\/sheet\d+\.xml$/.test(f))
        .map((f, i) => ({ name: `Sheet${i + 1}`, path: f }));

  for (const { name, path } of paths) {
    const xml = read(path);
    if (!xml) continue;
    const rows: string[][] = [];

    for (const rowXml of xml.match(/<row[^>]*\/>|<row[^>]*>[\s\S]*?<\/row>/g) ?? []) {
      const cells: string[] = [];
      for (const c of rowXml.match(/<c[^>]*\/>|<c[^>]*>[\s\S]*?<\/c>/g) ?? []) {
        const ref = c.match(/r="([A-Z]+\d+)"/)?.[1];
        const at = ref ? colIndex(ref) : cells.length;
        const type = c.match(/t="([^"]+)"/)?.[1];
        const style = Number(c.match(/s="(\d+)"/)?.[1] ?? -1);

        let value = "";
        if (type === "inlineStr") {
          value = decode([...c.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((m) => m[1]).join(""));
        } else {
          const raw = c.match(/<v>([\s\S]*?)<\/v>/)?.[1];
          if (raw !== undefined) {
            if (type === "s") value = strings[Number(raw)] ?? "";
            else if (type === "b") value = raw === "1" ? "TRUE" : "FALSE";
            else if (dates.has(style) && raw !== "" && !Number.isNaN(Number(raw))) value = iso(serialToDate(Number(raw)));
            else value = decode(raw);
          }
        }
        while (cells.length < at) cells.push("");
        cells[at] = value.trim();
      }
      if (cells.some((v) => v !== "")) rows.push(cells);
    }

    if (rows.length) sheets.push({ name, rows });
  }
  return sheets;
}
