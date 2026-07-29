"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Printer, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TallyMark } from "@/components/app/logo";
import { CATEGORIES, INCOME_CATEGORIES } from "@/lib/categories";
import { useStore, useMe, useMyId } from "@/store/useStore";
import { monthlyMoney, financeForMonth, spendByCategory, monthLabel, budgetView } from "@/lib/money";
import { scopedDebts, scopedTotals, splitOverview, myShare } from "@/lib/balances";
import { netWorth } from "@/lib/health";
import { withLiveBalances, unparkedAmount } from "@/lib/accounts";
import { formatINR, formatDate, percentShares, monthKey, cn } from "@/lib/utils";
import type { CategoryKey, Expense, IncomeCategory } from "@/lib/types";

const NOW_KEY = monthKey(new Date().toISOString());

/** Money entries and split expenses for one month, newest first. */
function rowsForMonth(expenses: Expense[], mKey: string) {
  return expenses
    .filter((e) => monthKey(e.date) === mKey && !e.isSettlement)
    .sort((a, b) => +new Date(b.date) - +new Date(a.date));
}

export default function ReportPage() {
  const me = useMe();
  const myId = useMyId() ?? "";
  const expenses = useStore((s) => s.expenses);
  const finance = useStore((s) => s.finance);
  const budget = useStore((s) => s.budget);
  const accounts = useStore((s) => s.accounts);
  const liabilities = useStore((s) => s.liabilities);
  const groups = useStore((s) => s.groups);
  const people = useStore((s) => s.people);

  const [mDate, setMDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const mKey = `${mDate.getFullYear()}-${String(mDate.getMonth() + 1).padStart(2, "0")}`;
  const atCurrent = mKey >= NOW_KEY;
  const shift = (n: number) => setMDate((d) => new Date(d.getFullYear(), d.getMonth() + n, 1));

  const m = useMemo(() => monthlyMoney(finance, expenses, myId, mKey), [finance, expenses, myId, mKey]);
  const entries = useMemo(() => financeForMonth(finance, mKey).filter((f) => !f.transfer), [finance, mKey]);
  const splitRows = useMemo(() => rowsForMonth(expenses, mKey), [expenses, mKey]);
  const byCat = useMemo(() => spendByCategory(finance, expenses, myId, mKey), [finance, expenses, myId, mKey]);
  const bv = useMemo(() => budgetView(budget, byCat, m.spend), [budget, byCat, m.spend]);
  const debts = useMemo(() => scopedDebts(expenses, myId), [expenses, myId]);
  const totals = useMemo(() => scopedTotals(debts), [debts]);
  const splits = useMemo(() => splitOverview(expenses, myId), [expenses, myId]);

  const live = useMemo(() => withLiveBalances(accounts, finance, expenses, myId), [accounts, finance, expenses, myId]);
  const unparked = useMemo(() => unparkedAmount(finance, expenses, accounts, myId), [finance, expenses, accounts, myId]);
  const nw = useMemo(() => netWorth(live, liabilities), [live, liabilities]);

  const catTotal = byCat.reduce((a, c) => a + c.amount, 0) || 1;
  const catShares = useMemo(() => percentShares(byCat.map((c) => c.amount)), [byCat]);
  const savingsRate = m.income > 0 ? Math.round((m.net / m.income) * 100) : null;
  const nameOf = (id: string) => (id === myId ? "You" : people.find((p) => p.id === id)?.name ?? "Someone");
  const generated = new Date();

  return (
    <div className="report mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 pb-[calc(var(--safe-bottom)+4rem)] pt-[calc(var(--safe-top)+1.25rem)] md:px-8 md:pt-[calc(var(--safe-top)+2rem)] print:max-w-none print:p-0">
      {/* Controls — never printed */}
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/analytics" className="flex w-fit items-center gap-1 text-sm font-medium text-text-2 hover:text-text">
          <ChevronLeft className="h-4 w-4" /> Insights
        </Link>
        {/* Wraps rather than pushing the page wider on a narrow phone. */}
        <div className="flex flex-wrap items-center justify-end gap-2">
          <div className="flex items-center gap-1">
            <button
              onClick={() => shift(-1)}
              className="flex h-9 w-9 items-center justify-center rounded-full text-text-2 transition-colors hover:bg-surface-inset"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="min-w-[6.5rem] text-center font-display text-[0.95rem] font-bold text-text sm:min-w-[8rem]">
              {monthLabel(mKey)}
            </span>
            <button
              onClick={() => shift(1)}
              disabled={atCurrent}
              className="flex h-9 w-9 items-center justify-center rounded-full text-text-2 transition-colors hover:bg-surface-inset disabled:opacity-30"
              aria-label="Next month"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
          <Button variant="primary" size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> Save as PDF
          </Button>
        </div>
      </div>

      <p className="rounded-[12px] bg-surface-inset px-3.5 py-2.5 text-[0.8rem] leading-snug text-text-2 print:hidden">
        This page is laid out for paper. “Save as PDF” opens your browser&apos;s print dialog — choose{" "}
        <b className="text-text">Save as PDF</b> as the destination. Turning off{" "}
        <b className="text-text">Headers and footers</b> there drops the date and web address your browser adds to each
        page.
      </p>

      {/* ---------- the sheet ---------- */}
      <article className="report-sheet flex flex-col gap-7">
        <header className="flex items-start justify-between gap-4 border-b border-border pb-5">
          <div className="min-w-0">
            <h1 className="font-display text-[1.7rem] font-bold leading-tight tracking-[-0.02em] text-text">
              Money report
            </h1>
            <p className="mt-0.5 text-[0.9rem] text-text-2">
              {me?.name ?? "You"} · {monthLabel(mKey)}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <TallyMark size={30} />
            <span className="font-display text-lg font-bold tracking-[-0.03em] text-text">Tally</span>
          </div>
        </header>

        {/* Summary */}
        <section className="break-inside-avoid">
          <h2 className="report-h2">This month</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Money in" value={formatINR(m.income)} tone="positive" />
            <Stat label="Money out" value={formatINR(m.spend)} />
            <Stat label={m.net < 0 ? "Overspent" : "Left over"} value={formatINR(Math.abs(m.net))} tone={m.net < 0 ? "negative" : "positive"} />
            <Stat label="Saved" value={savingsRate === null ? "—" : `${savingsRate}%`} />
          </div>
          {bv.hasBudget && bv.monthly > 0 && (
            <p className="mt-3 text-[0.85rem] text-text-2">
              Budget {formatINR(bv.monthly)} · spent {formatINR(bv.spent)}
              {bv.over ? ` · ${formatINR(bv.spent - bv.monthly)} over` : ` · ${formatINR(bv.monthly - bv.spent)} to spare`}
            </p>
          )}
          {m.splitSpend > 0.5 && (
            <p className="mt-1 text-[0.85rem] text-text-2">
              Includes {formatINR(m.splitSpend)} as your share of split expenses.
            </p>
          )}
        </section>

        {/* Where it went */}
        {byCat.length > 0 && (
          <section className="break-inside-avoid">
            <h2 className="report-h2">Where it went</h2>
            <table className="report-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th className="w-[4rem] text-right sm:w-[5rem]">Share</th>
                  <th className="w-[6.5rem] text-right sm:w-[8rem]">Amount</th>
                </tr>
              </thead>
              <tbody>
                {byCat.map((c, i) => {
                  const meta = CATEGORIES[c.category] ?? CATEGORIES.other;
                  return (
                    <tr key={c.category}>
                      <td>
                        <span className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: meta.color }} />
                          {meta.label}
                        </span>
                      </td>
                      <td className="text-right tnum text-text-2">{catShares[i]}%</td>
                      <td className="text-right tnum font-semibold">{formatINR(c.amount)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td>Total</td>
                  <td />
                  <td className="text-right tnum font-bold">{formatINR(catTotal)}</td>
                </tr>
              </tfoot>
            </table>
          </section>
        )}

        {/* Splits */}
        {(splits.direct.people > 0 || splits.group.people > 0 || debts.length > 0) && (
          <section className="break-inside-avoid">
            <h2 className="report-h2">Splits</h2>
            <div className="grid grid-cols-2 gap-3">
              <Stat label="Owed to you" value={formatINR(totals.owedToYou)} tone="positive" />
              <Stat label="You owe" value={formatINR(totals.youOwe)} tone={totals.youOwe > 0 ? "negative" : undefined} />
            </div>
            {debts.length > 0 && (
              <table className="report-table mt-3">
                <thead>
                  <tr>
                    <th>Person</th>
                    <th className="w-[9.5rem] text-right sm:w-[12rem]">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {debts.map((d) => (
                    <tr key={d.personId}>
                      <td className="wrap">{nameOf(d.personId)}</td>
                      <td className={cn("text-right tnum font-semibold", d.total > 0 ? "text-positive" : "text-negative")}>
                        {d.total > 0 ? `owes you ${formatINR(d.total)}` : `you owe ${formatINR(-d.total)}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        )}

        {/* Transactions */}
        <section>
          <h2 className="report-h2">
            Transactions <span className="font-normal text-text-3">({entries.length + splitRows.length})</span>
          </h2>
          {entries.length + splitRows.length === 0 ? (
            <p className="text-[0.88rem] text-text-2">Nothing logged for {monthLabel(mKey)}.</p>
          ) : (
            <table className="report-table">
              <thead>
                <tr>
                  <th className="w-[4.6rem] sm:w-[5.6rem]">Date</th>
                  <th>Description</th>
                  <th className="hidden sm:table-cell sm:w-[7.5rem] print:table-cell">Category</th>
                  <th className="hidden sm:table-cell sm:w-[6rem] print:table-cell">Kind</th>
                  <th className="w-[5.2rem] text-right sm:w-[6.5rem]">Amount</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ...entries.map((e) => ({
                    id: e.id,
                    date: e.date,
                    desc:
                      e.note?.trim() ||
                      (e.type === "income"
                        ? (INCOME_CATEGORIES[e.category as IncomeCategory] ?? INCOME_CATEGORIES.other).label
                        : (CATEGORIES[e.category as CategoryKey] ?? CATEGORIES.other).label),
                    cat:
                      e.type === "income"
                        ? (INCOME_CATEGORIES[e.category as IncomeCategory] ?? INCOME_CATEGORIES.other).label
                        : (CATEGORIES[e.category as CategoryKey] ?? CATEGORIES.other).label,
                    kind: "Just you",
                    amount: e.type === "income" ? e.amount : -e.amount,
                  })),
                  ...splitRows.map((e) => ({
                    id: e.id,
                    date: e.date,
                    desc: e.description,
                    cat: (CATEGORIES[e.category] ?? CATEGORIES.other).label,
                    kind: e.groupId ? groups.find((g) => g.id === e.groupId)?.name ?? "Group" : "Split",
                    amount: -myShare(e, myId),
                  })),
                ]
                  .sort((a, b) => +new Date(b.date) - +new Date(a.date))
                  .map((r) => (
                    <tr key={r.id}>
                      <td className="tnum text-text-2">{formatDate(r.date, true)}</td>
                      <td className="wrap">
                        {r.desc}
                        {/* On a phone the two columns below are folded in here —
                            skipping the category when it's already the description. */}
                        <span className="block text-[0.72rem] leading-tight text-text-3 sm:hidden print:hidden">
                          {r.cat === r.desc ? r.kind : `${r.cat} · ${r.kind}`}
                        </span>
                      </td>
                      <td className="hidden text-text-2 sm:table-cell print:table-cell">{r.cat}</td>
                      <td className="hidden text-text-2 sm:table-cell print:table-cell">{r.kind}</td>
                      <td className={cn("text-right tnum font-semibold", r.amount > 0 && "text-positive")}>
                        {r.amount > 0 ? "+" : "−"}
                        {formatINR(Math.abs(r.amount))}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </section>

        {/* Standing */}
        <section className="break-inside-avoid">
          <h2 className="report-h2">Where you stand</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Assets" value={formatINR(nw.assets + unparked)} />
            <Stat label="Liabilities" value={formatINR(nw.debts)} />
            <Stat
              label="Net worth"
              value={formatINR(nw.net + unparked)}
              tone={nw.net + unparked >= 0 ? "positive" : "negative"}
            />
            <Stat label="Accounts" value={String(live.filter((a) => a.kind !== "investment").length)} />
          </div>
        </section>

        <footer className="border-t border-border pt-4 text-[0.76rem] text-text-3">
          Generated by Tally on {formatDate(generated.toISOString(), true)} · Amounts in ₹ · Split balances are simplified
          within each group.
        </footer>
      </article>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "positive" | "negative" }) {
  return (
    <div className="rounded-[12px] border border-border bg-surface-2 px-3.5 py-3">
      <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-text-3">{label}</p>
      <p
        className={cn(
          "mt-0.5 font-display text-[1.15rem] font-bold tnum",
          tone === "positive" ? "text-positive" : tone === "negative" ? "text-negative" : "text-text",
        )}
      >
        {value}
      </p>
    </div>
  );
}
