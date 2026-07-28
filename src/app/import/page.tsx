"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft, Upload, FileSpreadsheet, AlertTriangle, Check, X, CopyCheck, Ban, Loader2, ArrowRight,
} from "lucide-react";
import { Card, SectionHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AccountPicker } from "@/components/features/account-picker";
import { CATEGORIES, INCOME_CATEGORIES } from "@/lib/categories";
import { parseCsv, MAX_FILE_BYTES, MAX_ROWS, type Delimiter } from "@/lib/csv";
import {
  detectColumns, buildDrafts, summarise, toEntries, usesMonthFirst,
  type ColumnRole, type DraftEntry,
} from "@/lib/import";
import { useStore } from "@/store/useStore";
import { useToast } from "@/components/ui/toast";
import { formatINR, formatDate, cn } from "@/lib/utils";
import type { CategoryKey, IncomeCategory } from "@/lib/types";

type Stage = "pick" | "map" | "done";

const ROLE_LABEL: Record<ColumnRole, string> = {
  date: "Date",
  description: "Description",
  amount: "Amount",
  debit: "Money out",
  credit: "Money in",
  ignore: "Skip",
};
const ROLES: ColumnRole[] = ["date", "description", "amount", "debit", "credit", "ignore"];

export default function ImportPage() {
  const router = useRouter();
  const finance = useStore((s) => s.finance);
  const importFinance = useStore((s) => s.importFinance);
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [stage, setStage] = useState<Stage>("pick");
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [rows, setRows] = useState<string[][]>([]);
  const [delimiter, setDelimiter] = useState<Delimiter>(",");
  const [roles, setRoles] = useState<ColumnRole[]>([]);
  const [hasHeader, setHasHeader] = useState(true);
  const [monthFirst, setMonthFirst] = useState(false);
  const [drafts, setDrafts] = useState<DraftEntry[]>([]);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [added, setAdded] = useState(0);

  const header = rows[0] ?? [];
  const summary = useMemo(() => summarise(drafts), [drafts]);
  const mapped = roles.includes("date") && (roles.includes("amount") || roles.includes("debit") || roles.includes("credit"));

  function reset() {
    setStage("pick");
    setFileName("");
    setError(null);
    setNotice(null);
    setRows([]);
    setDrafts([]);
    setAdded(0);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setNotice(null);

    if (!/\.(csv|txt|tsv)$/i.test(file.name)) {
      setError("That's not a CSV. Export your statement as CSV (or Excel → Save As → CSV) and try again.");
      return;
    }
    if (file.size === 0) {
      setError("That file is empty.");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setError(
        `That file is ${(file.size / 1024 / 1024).toFixed(1)} MB — the limit is ${MAX_FILE_BYTES / 1024 / 1024} MB. Export a shorter date range and import it in a couple of goes.`,
      );
      return;
    }

    let text: string;
    try {
      text = await file.text();
    } catch {
      setError("Couldn't read that file. Try re-exporting it from your bank.");
      return;
    }

    const parsed = parseCsv(text);
    if (parsed.rows.length === 0) {
      setError("There's nothing in that file.");
      return;
    }
    if (parsed.rows.length < 2) {
      setError("That file has a header but no transactions.");
      return;
    }

    const notices: string[] = [];
    if (parsed.truncated) notices.push(`Only the first ${MAX_ROWS.toLocaleString("en-IN")} rows were read.`);
    if (parsed.skippedBlank > 0) notices.push(`${parsed.skippedBlank} blank ${parsed.skippedBlank === 1 ? "row" : "rows"} skipped.`);

    const body = parsed.rows.slice(1);
    const guessed = detectColumns(parsed.rows[0], body.slice(0, 20));
    const dateCol = guessed.indexOf("date");
    const mf = dateCol >= 0 ? usesMonthFirst(body.slice(0, 50).map((r) => r[dateCol] ?? "")) : false;

    setFileName(file.name);
    setRows(parsed.rows);
    setDelimiter(parsed.delimiter);
    setRoles(guessed);
    setHasHeader(true);
    setMonthFirst(mf);
    setNotice(notices.join(" ") || null);
    setDrafts(buildDrafts({ rows: parsed.rows, roles: guessed, hasHeader: true, existing: finance, monthFirst: mf }));
    setStage("map");
  }

  function rebuild(next: Partial<{ roles: ColumnRole[]; hasHeader: boolean; monthFirst: boolean }>) {
    const r = next.roles ?? roles;
    const h = next.hasHeader ?? hasHeader;
    const mf = next.monthFirst ?? monthFirst;
    if (next.roles) setRoles(r);
    if (next.hasHeader !== undefined) setHasHeader(h);
    if (next.monthFirst !== undefined) setMonthFirst(mf);
    setDrafts(buildDrafts({ rows, roles: r, hasHeader: h, existing: finance, monthFirst: mf }));
  }

  function setRole(col: number, role: ColumnRole) {
    const next = [...roles];
    // Date and description are single-slot; free whichever column held it.
    if (role !== "ignore" && role !== "debit" && role !== "credit") {
      next.forEach((r, i) => {
        if (r === role && i !== col) next[i] = "ignore";
      });
    }
    next[col] = role;
    rebuild({ roles: next });
  }

  const toggle = (i: number) =>
    setDrafts((ds) => ds.map((d, x) => (x === i ? { ...d, include: !d.include && !d.problem ? true : false } : d)));

  const setAll = (on: boolean) =>
    setDrafts((ds) => ds.map((d) => ({ ...d, include: on && !d.problem ? true : false })));

  async function confirmImport() {
    const entries = toEntries(drafts, accountId);
    if (!entries.length) return;
    setBusy(true);
    const res = await importFinance(entries);
    setBusy(false);
    if (!res.ok) {
      setError("Couldn't save those entries. Check your connection and try again — nothing was imported.");
      return;
    }
    setAdded(res.added);
    setStage("done");
    toast({ message: `${res.added} ${res.added === 1 ? "entry" : "entries"} imported` });
  }

  /* ---------- done ---------- */
  if (stage === "done") {
    return (
      <div className="flex flex-col gap-6">
        <Back />
        <Card className="flex flex-col items-center gap-4 p-8 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-positive-soft text-positive">
            <Check className="h-7 w-7" strokeWidth={2.5} />
          </span>
          <div>
            <h1 className="font-display text-xl font-bold text-text">
              {added} {added === 1 ? "entry" : "entries"} imported
            </h1>
            <p className="mt-1 text-[0.88rem] text-text-2">They&apos;re in your Money page, ready to review.</p>
          </div>
          <div className="flex gap-2.5">
            <Button variant="secondary" onClick={reset}>
              Import another
            </Button>
            <Button variant="primary" onClick={() => router.push("/money")}>
              See them <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  /* ---------- pick a file ---------- */
  if (stage === "pick") {
    return (
      <div className="flex flex-col gap-6">
        <Back />
        <div>
          <h1 className="font-display text-2xl font-bold tracking-[-0.02em]">Import a statement</h1>
          <p className="mt-0.5 text-[0.84rem] text-text-3">
            Bring in months of spending at once instead of typing it all in
          </p>
        </div>

        {error && <Problem>{error}</Problem>}

        <button
          onClick={() => fileRef.current?.click()}
          className="flex flex-col items-center gap-3 rounded-[20px] border border-dashed border-border-strong bg-surface p-10 text-center transition-colors hover:bg-surface-2"
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-soft text-brand">
            <Upload className="h-6 w-6" />
          </span>
          <span>
            <span className="block text-[0.95rem] font-semibold text-text">Choose a CSV file</span>
            <span className="mt-0.5 block text-[0.8rem] text-text-3">
              Up to {MAX_FILE_BYTES / 1024 / 1024} MB and {MAX_ROWS.toLocaleString("en-IN")} rows
            </span>
          </span>
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.txt,.tsv,text/csv"
          className="hidden"
          onChange={(e) => onFile(e.target.files?.[0])}
        />

        <Card className="p-5">
          <p className="text-[0.72rem] font-semibold uppercase tracking-wide text-text-3">How to get the file</p>
          <ol className="mt-2.5 flex list-decimal flex-col gap-1.5 pl-4 text-[0.85rem] leading-snug text-text-2">
            <li>Open net banking and go to your account statement.</li>
            <li>Pick a date range and download it as CSV or Excel.</li>
            <li>If it&apos;s an Excel file, open it and save a copy as CSV.</li>
          </ol>
          <p className="mt-3 rounded-[12px] bg-surface-inset px-3 py-2.5 text-[0.78rem] leading-snug text-text-2">
            Your file is read here on your device — it&apos;s never uploaded anywhere. Only the entries you choose get
            saved to your account.
          </p>
        </Card>
      </div>
    );
  }

  /* ---------- map + review ---------- */
  return (
    <div className="flex flex-col gap-6">
      <Back />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold tracking-[-0.02em]">Check before importing</h1>
          <p className="mt-0.5 truncate text-[0.84rem] text-text-3">
            <FileSpreadsheet className="mr-1 inline h-3.5 w-3.5" />
            {fileName} · {rows.length - (hasHeader ? 1 : 0)} rows
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={reset}>
          <X className="h-4 w-4" /> Cancel
        </Button>
      </div>

      {error && <Problem>{error}</Problem>}
      {notice && (
        <p className="rounded-[12px] bg-surface-inset px-3.5 py-2.5 text-[0.8rem] leading-snug text-text-2">{notice}</p>
      )}

      {/* Columns */}
      <section>
        <SectionHeader title="Which column is which" />
        <Card className="p-4">
          <div className="flex flex-col gap-2">
            {header.map((h, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[0.86rem] font-medium text-text">{hasHeader ? h || `Column ${i + 1}` : `Column ${i + 1}`}</p>
                  <p className="truncate text-[0.74rem] text-text-3">
                    {(rows[hasHeader ? 1 : 0] ?? [])[i] || "—"}
                  </p>
                </div>
                <select
                  value={roles[i]}
                  onChange={(e) => setRole(i, e.target.value as ColumnRole)}
                  className="h-9 shrink-0 rounded-[10px] border border-border bg-surface px-2 text-[0.82rem] font-medium text-text outline-none"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABEL[r]}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-3">
            <Toggle on={hasHeader} onClick={() => rebuild({ hasHeader: !hasHeader })}>
              First row is a header
            </Toggle>
            <Toggle on={monthFirst} onClick={() => rebuild({ monthFirst: !monthFirst })}>
              Dates are month/day
            </Toggle>
            <span className="self-center text-[0.76rem] text-text-3">
              Split by {delimiter === "\t" ? "tab" : `"${delimiter}"`}
            </span>
          </div>

          {!mapped && (
            <p className="mt-3 flex items-start gap-1.5 text-[0.8rem] leading-snug text-negative">
              <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" />
              Pick a Date column, and either an Amount column or Money in/out columns.
            </p>
          )}
        </Card>
      </section>

      {mapped && (
        <>
          {/* What will happen */}
          <section>
            <SectionHeader title="What will be imported" />
            <Card className="p-5">
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                <Stat label="Ready" value={String(summary.ready)} tone="brand" />
                <Stat label="Already here" value={String(summary.duplicates)} tone={summary.duplicates ? "warn" : "muted"} />
                <Stat label="Repeated in file" value={String(summary.repeats)} tone={summary.repeats ? "warn" : "muted"} />
                <Stat label="Can't read" value={String(summary.problems)} tone={summary.problems ? "negative" : "muted"} />
              </div>
              {summary.ready > 0 && (
                <p className="mt-3.5 text-[0.85rem] leading-snug text-text-2">
                  {summary.expense > 0 && (
                    <>
                      <b className="text-text">{summary.expense}</b> expenses totalling{" "}
                      <b className="text-text">{formatINR(summary.expenseTotal)}</b>
                    </>
                  )}
                  {summary.expense > 0 && summary.income > 0 && " · "}
                  {summary.income > 0 && (
                    <>
                      <b className="text-text">{summary.income}</b> income totalling{" "}
                      <b className="text-positive">{formatINR(summary.incomeTotal)}</b>
                    </>
                  )}
                </p>
              )}
              {(summary.duplicates > 0 || summary.repeats > 0) && (
                <p className="mt-2.5 flex items-start gap-1.5 rounded-[12px] bg-surface-inset px-3 py-2.5 text-[0.78rem] leading-snug text-text-2">
                  <CopyCheck className="mt-px h-3.5 w-3.5 shrink-0" />
                  Entries that already exist in Tally, or repeat within this file, are switched off so nothing gets counted
                  twice. Tick one to bring it in anyway.
                </p>
              )}
            </Card>
          </section>

          <AccountPicker value={accountId} onChange={setAccountId} label="Which account is this statement for?" />

          {/* Rows */}
          <section>
            <SectionHeader
              title="Every row"
              action={
                <span className="flex gap-3">
                  <button onClick={() => setAll(true)} className="text-[0.78rem] font-semibold text-brand">
                    Select all
                  </button>
                  <button onClick={() => setAll(false)} className="text-[0.78rem] font-semibold text-text-3">
                    None
                  </button>
                </span>
              }
            />
            <Card className="overflow-hidden">
              <div className="max-h-[28rem] divide-y divide-border overflow-y-auto">
                {drafts.map((d, i) => {
                  const meta =
                    d.type === "income"
                      ? INCOME_CATEGORIES[d.category as IncomeCategory] ?? INCOME_CATEGORIES.other
                      : CATEGORIES[d.category as CategoryKey] ?? CATEGORIES.other;
                  const Icon = meta.icon;
                  return (
                    <button
                      key={i}
                      onClick={() => !d.problem && toggle(i)}
                      disabled={Boolean(d.problem)}
                      className={cn(
                        "flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors",
                        d.problem ? "opacity-50" : "hover:bg-surface-2",
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-5 w-5 shrink-0 items-center justify-center rounded-[6px] border",
                          d.include ? "border-transparent bg-brand text-on-brand" : "border-border-strong",
                        )}
                      >
                        {d.include && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                        {d.problem && <Ban className="h-3 w-3 text-text-3" />}
                      </span>
                      <Icon className="h-4 w-4 shrink-0 text-text-3" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[0.85rem] font-medium text-text">{d.description || "—"}</p>
                        <p className="truncate text-[0.73rem] text-text-3">
                          {d.date ? formatDate(d.date.toISOString(), true) : `Line ${d.row}`}
                          {d.duplicate && <span className="text-warning"> · already in Tally</span>}
                          {d.repeatInFile && !d.duplicate && <span className="text-warning"> · repeated above</span>}
                          {d.problem === "no-date" && <span className="text-negative"> · no date found</span>}
                          {d.problem === "no-amount" && <span className="text-negative"> · no amount found</span>}
                          {d.problem === "zero-amount" && <span className="text-negative"> · zero amount</span>}
                        </p>
                      </div>
                      {!d.problem && (
                        <span
                          className={cn(
                            "shrink-0 tnum text-[0.85rem] font-semibold",
                            d.type === "income" ? "text-positive" : "text-text",
                          )}
                        >
                          {d.type === "income" ? "+" : "−"}
                          {formatINR(d.amount)}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </Card>
          </section>

          {/* Confirm */}
          <div className="sticky bottom-4 flex gap-3 rounded-[18px] border border-border bg-surface p-3 shadow-[var(--shadow-lg)]">
            <div className="min-w-0 flex-1 self-center px-1">
              <p className="text-[0.85rem] font-semibold text-text">
                {summary.ready} {summary.ready === 1 ? "entry" : "entries"} selected
              </p>
              <p className="truncate text-[0.75rem] text-text-3">Nothing is saved until you confirm.</p>
            </div>
            <Button variant="primary" size="lg" disabled={summary.ready === 0 || busy} onClick={confirmImport}>
              {busy ? <Loader2 className="h-4.5 w-4.5 animate-spin" /> : <Check className="h-4.5 w-4.5" />}
              Import {summary.ready}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

/* ---------- bits ---------- */

function Back() {
  return (
    <Link href="/money" className="-mb-1 flex w-fit items-center gap-1 text-sm font-medium text-text-2 hover:text-text">
      <ChevronLeft className="h-4 w-4" /> Money
    </Link>
  );
}

function Problem({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 rounded-[14px] border border-negative/30 bg-negative-soft px-4 py-3 text-negative">
      <AlertTriangle className="mt-0.5 h-4.5 w-4.5 shrink-0" />
      <p className="text-[0.85rem] font-medium leading-snug">{children}</p>
    </div>
  );
}

function Toggle({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1.5 text-[0.78rem] font-medium transition-all",
        on ? "border-transparent bg-brand-soft text-brand-on-soft" : "border-border bg-surface text-text-2",
      )}
    >
      {children}
    </button>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: "brand" | "warn" | "negative" | "muted" }) {
  const styles = {
    brand: "text-brand",
    warn: "text-warning",
    negative: "text-negative",
    muted: "text-text-3",
  }[tone];
  return (
    <div className="rounded-[14px] bg-surface-inset p-3">
      <p className="text-[0.7rem] font-medium text-text-3">{label}</p>
      <p className={cn("mt-0.5 font-display text-xl font-bold tnum", styles)}>{value}</p>
    </div>
  );
}
