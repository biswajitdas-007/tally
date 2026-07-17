"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Plus, Minus, ChevronLeft, ChevronRight, ArrowUpRight, ArrowDownLeft,
  TrendingUp, AlertTriangle, Wallet, Coins,
} from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { Card, SectionHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { useStore, useMyId } from "@/store/useStore";
import { useUI } from "@/store/useUI";
import { CATEGORIES, INCOME_CATEGORIES } from "@/lib/categories";
import { monthlyMoney, financeForMonth, spendByCategory, monthLabel } from "@/lib/money";
import { formatINR, monthKey, cn } from "@/lib/utils";
import type { CategoryKey, FinanceEntry, IncomeCategory } from "@/lib/types";

const NOW_KEY = monthKey(new Date().toISOString());

function entryMeta(e: FinanceEntry) {
  if (e.type === "income") {
    const m = INCOME_CATEGORIES[e.category as IncomeCategory] ?? INCOME_CATEGORIES.other;
    return { label: m.label, Icon: m.icon };
  }
  const m = CATEGORIES[e.category as CategoryKey] ?? CATEGORIES.other;
  return { label: m.label, Icon: m.icon };
}

export default function MoneyPage() {
  const finance = useStore((s) => s.finance);
  const expenses = useStore((s) => s.expenses);
  const openMoney = useUI((s) => s.openMoney);
  const myId = useMyId() ?? "";

  const [mDate, setMDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const mKey = `${mDate.getFullYear()}-${String(mDate.getMonth() + 1).padStart(2, "0")}`;
  const atCurrent = mKey >= NOW_KEY;
  const shift = (n: number) => setMDate((d) => new Date(d.getFullYear(), d.getMonth() + n, 1));

  const m = useMemo(() => monthlyMoney(finance, expenses, myId, mKey), [finance, expenses, myId, mKey]);
  const entries = useMemo(() => financeForMonth(finance, mKey), [finance, mKey]);
  const byCat = useMemo(() => spendByCategory(finance, expenses, myId, mKey), [finance, expenses, myId, mKey]);

  const overspent = m.net < -0.5;
  const hasData = m.income > 0 || m.spend > 0;
  const savingsRate = m.income > 0 ? Math.round((m.net / m.income) * 100) : null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Money" subtitle="Your personal income & spending" />

      {/* Month switcher */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => shift(-1)}
          className="flex h-9 w-9 items-center justify-center rounded-full text-text-2 transition-colors hover:bg-surface-inset"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <span className="font-display text-[0.98rem] font-bold tracking-[-0.01em] text-text">{monthLabel(mKey)}</span>
        <button
          onClick={() => shift(1)}
          disabled={atCurrent}
          className="flex h-9 w-9 items-center justify-center rounded-full text-text-2 transition-colors hover:bg-surface-inset disabled:opacity-30"
          aria-label="Next month"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Overview hero — turns warm when you overspend */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 240, damping: 26 }}
        className="relative overflow-hidden rounded-[24px] p-5 text-white shadow-[var(--shadow-lg)]"
        style={{
          background: overspent
            ? "linear-gradient(152deg,#c2623f 0%,#a4462a 48%,#7f321d 100%)"
            : "linear-gradient(152deg,#22795d 0%,#185a44 46%,#0f3f2e 100%)",
        }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.14]"
          style={{
            backgroundImage: "repeating-linear-gradient(90deg, rgba(255,255,255,0.6) 0 1px, transparent 1px 27px)",
            maskImage: "linear-gradient(to bottom, transparent, #000 30%, #000 70%, transparent)",
          }}
        />
        <div className="relative">
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.1em] text-white/60">
            {overspent ? "Over budget this month" : "Left this month"}
          </p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-display text-[2.75rem] font-bold leading-none tracking-[-0.03em] tnum">
              {formatINR(Math.abs(m.net))}
            </span>
            {savingsRate !== null && !overspent && (
              <span className="rounded-full bg-white/15 px-2 py-0.5 text-[0.72rem] font-semibold">{savingsRate}% saved</span>
            )}
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2.5">
            <div className="rounded-[14px] bg-white/10 p-3 ring-1 ring-white/10">
              <div className="flex items-center gap-1.5 text-white/70">
                <ArrowUpRight className="h-3.5 w-3.5" />
                <span className="text-[0.72rem] font-medium">Money in</span>
              </div>
              <p className="mt-1 font-display text-xl font-bold tnum" style={{ color: "#a6f2cf" }}>{formatINR(m.income)}</p>
            </div>
            <div className="rounded-[14px] bg-white/10 p-3 ring-1 ring-white/10">
              <div className="flex items-center gap-1.5 text-white/70">
                <ArrowDownLeft className="h-3.5 w-3.5" />
                <span className="text-[0.72rem] font-medium">Money out</span>
              </div>
              <p className="mt-1 font-display text-xl font-bold tnum" style={{ color: "#ffc0a6" }}>{formatINR(m.spend)}</p>
            </div>
          </div>

          {m.splitSpend > 0.5 && (
            <p className="mt-3 text-[0.74rem] text-white/70">
              Includes {formatINR(m.splitSpend)} from your splits, pulled in automatically.
            </p>
          )}
        </div>
      </motion.div>

      {/* Status line */}
      {hasData && (
        <div
          className={cn(
            "flex items-center gap-2.5 rounded-[14px] border px-4 py-3 text-[0.86rem]",
            overspent
              ? "border-negative/30 bg-negative-soft text-negative"
              : "border-positive/25 bg-positive-soft text-positive",
          )}
        >
          {overspent ? <AlertTriangle className="h-4.5 w-4.5 shrink-0" /> : <TrendingUp className="h-4.5 w-4.5 shrink-0" />}
          <span className="font-medium">
            {m.income === 0
              ? "Add your income to see how you're tracking."
              : overspent
                ? `You've spent ${formatINR(-m.net)} more than you earned this month.`
                : `Nice — you're keeping ${formatINR(m.net)} of what you earned.`}
          </span>
        </div>
      )}

      {/* Add actions */}
      <div className="flex gap-2.5">
        <button
          onClick={() => openMoney("expense")}
          className="flex flex-1 items-center justify-center gap-2 rounded-[15px] border border-border bg-surface py-3 text-[0.9rem] font-semibold text-text transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-sm)]"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-negative-soft text-negative"><Minus className="h-4 w-4" /></span>
          Add expense
        </button>
        <button
          onClick={() => openMoney("income")}
          className="flex flex-1 items-center justify-center gap-2 rounded-[15px] border border-border bg-surface py-3 text-[0.9rem] font-semibold text-text transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-sm)]"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-positive-soft text-positive"><Plus className="h-4 w-4" /></span>
          Add income
        </button>
      </div>

      {/* Spending by category */}
      {byCat.length > 0 && (
        <section>
          <SectionHeader title="Where it went" />
          <Card className="flex flex-col gap-3 p-4">
            {byCat.slice(0, 6).map((c) => {
              const meta = CATEGORIES[c.category] ?? CATEGORIES.other;
              const Icon = meta.icon;
              const pct = m.spend > 0 ? Math.round((c.amount / m.spend) * 100) : 0;
              return (
                <div key={c.category} className="flex items-center gap-3">
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                    style={{ background: `color-mix(in srgb, ${meta.color} 16%, transparent)`, color: meta.color }}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[0.86rem] font-medium text-text">{meta.label}</span>
                      <span className="tnum text-[0.84rem] font-semibold text-text">{formatINR(c.amount)}</span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-inset">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: meta.color }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </Card>
        </section>
      )}

      {/* Your entries */}
      <section>
        <SectionHeader title="Your entries" />
        {entries.length > 0 ? (
          <Card className="overflow-hidden">
            <div className="divide-y divide-border">
              {entries.map((e) => {
                const { label, Icon } = entryMeta(e);
                const income = e.type === "income";
                return (
                  <button
                    key={e.id}
                    onClick={() => openMoney(e.type, e.id)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-2 active:bg-surface-inset"
                  >
                    <span
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                        income ? "bg-positive-soft text-positive" : "bg-surface-inset text-text-2",
                      )}
                    >
                      <Icon className="h-[18px] w-[18px]" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[0.9rem] font-medium text-text">{e.note?.trim() || label}</p>
                      <p className="text-[0.76rem] text-text-3">
                        {label} · {new Date(e.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                      </p>
                    </div>
                    <span className={cn("tnum text-[0.92rem] font-semibold", income ? "text-positive" : "text-text")}>
                      {income ? "+" : "−"}
                      {formatINR(e.amount)}
                    </span>
                  </button>
                );
              })}
            </div>
          </Card>
        ) : (
          <Card>
            <EmptyState
              icon={Coins}
              title="Nothing logged yet"
              description="Add your salary and everyday spending to see where your money goes each month."
            />
          </Card>
        )}
      </section>

      {m.splitSpend > 0.5 && entries.length === 0 && (
        <p className="-mt-2 flex items-center justify-center gap-1.5 text-center text-[0.78rem] text-text-3">
          <Wallet className="h-3.5 w-3.5" /> Your {formatINR(m.splitSpend)} of splits is already counted above.
        </p>
      )}
    </div>
  );
}
