"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Plus, Minus, ChevronLeft, ChevronRight, ArrowUpRight, ArrowDownLeft,
  TrendingUp, AlertTriangle, Wallet, Coins, Target, Scale, ShieldAlert, Repeat, BellRing,
} from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { PageGrid, PageCol } from "@/components/app/page-grid";
import { Card, SectionHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useStore, useMyId } from "@/store/useStore";
import { useUI } from "@/store/useUI";
import { CATEGORIES, INCOME_CATEGORIES } from "@/lib/categories";
import { monthlyMoney, financeForMonth, spendByCategory, monthLabel, budgetView, moneyStatus, missingIncome, suggestedBudget } from "@/lib/money";
import { healthScore, netWorth, gradeColor, wealthRunway, emergencyStatus } from "@/lib/health";
import { pendingFromSplits } from "@/lib/balances";
import { PendingSplitsCard } from "@/components/features/pending-splits-card";
import { isDue, recurLabel, nextOccurrence } from "@/lib/recurring";
import { withLiveBalances, unparkedAmount } from "@/lib/accounts";
import { formatINR, formatDate, monthKey, cn } from "@/lib/utils";
import type { CategoryKey, FinanceEntry, IncomeCategory } from "@/lib/types";

const NOW_KEY = monthKey(new Date().toISOString());

function BudgetBar({ label, spent, limit }: { label: string; spent: number; limit: number }) {
  const ratio = limit > 0 ? spent / limit : 0;
  const pct = Math.min(ratio * 100, 100);
  const color = ratio > 1 ? "var(--negative)" : ratio >= 0.8 ? "var(--warning)" : "var(--brand)";
  return (
    <div>
      <div className="flex items-center justify-between text-[0.84rem]">
        <span className="font-medium text-text">{label}</span>
        <span className="tnum text-text-2">
          <span className={cn("font-semibold", ratio > 1 ? "text-negative" : "text-text")}>{formatINR(spent)}</span>
          {" / "}
          {formatINR(limit)}
        </span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-inset">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

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
  const budget = useStore((s) => s.budget);
  const accounts = useStore((s) => s.accounts);
  const liabilities = useStore((s) => s.liabilities);
  const emergency = useStore((s) => s.emergency);
  const openMoney = useUI((s) => s.openMoney);
  const openBudget = useUI((s) => s.openBudget);
  const openEmergency = useUI((s) => s.openEmergency);
  const openRecur = useUI((s) => s.openRecur);
  const recurrings = useStore((s) => s.recurrings);
  const runRecurring = useStore((s) => s.runRecurring);
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
  const bv = useMemo(() => budgetView(budget, byCat, m.spend), [budget, byCat, m.spend]);
  const liveAccounts = useMemo(
    () => withLiveBalances(accounts, finance, expenses, myId),
    [accounts, finance, expenses, myId],
  );
  const unparked = useMemo(() => unparkedAmount(finance, expenses, accounts, myId), [finance, expenses, accounts, myId]);
  const health = useMemo(
    () => healthScore({ finance, expenses, meId: myId, budget, accounts: liveAccounts, liabilities, emergency, unparked }),
    [finance, expenses, myId, budget, liveAccounts, liabilities, emergency, unparked],
  );
  const ef = useMemo(() => emergencyStatus(emergency, liveAccounts, unparked), [emergency, liveAccounts, unparked]);
  const nw = useMemo(
    () => ({ net: netWorth(liveAccounts, liabilities).net + unparked }),
    [liveAccounts, liabilities, unparked],
  );
  const runway = useMemo(
    () => wealthRunway({ finance, expenses, meId: myId, accounts: liveAccounts, liabilities, unparked }),
    [finance, expenses, myId, liveAccounts, liabilities, unparked],
  );

  const pending = useMemo(() => pendingFromSplits(expenses, myId), [expenses, myId]);
  const needsIncome = useMemo(() => missingIncome(finance, expenses, myId), [finance, expenses, myId]);
  const suggested = useMemo(() => suggestedBudget(finance, expenses, myId), [finance, expenses, myId]);
  // A limit that's beaten every month has stopped being a limit.
  const budgetUnrealistic = bv.hasBudget && bv.monthly > 0 && suggested > bv.monthly * 1.2;
  const dueRules = useMemo(() => recurrings.filter((r) => isDue(r)), [recurrings]);
  const addAllDue = () => dueRules.forEach((r) => runRecurring(r.id));

  const overspent = m.net < -0.5;
  const hasData = m.income > 0 || m.spend > 0;
  const savingsRate = m.income > 0 ? Math.round((m.net / m.income) * 100) : null;
  const status = moneyStatus(m.income, m.spend);

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

      <PageGrid>
        <PageCol>
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
                    <ArrowDownLeft className="h-3.5 w-3.5" />
                    <span className="text-[0.72rem] font-medium">Money in</span>
                  </div>
                  <p className="mt-1 font-display text-xl font-bold tnum" style={{ color: "#a6f2cf" }}>{formatINR(m.income)}</p>
                </div>
                <div className="rounded-[14px] bg-white/10 p-3 ring-1 ring-white/10">
                  <div className="flex items-center gap-1.5 text-white/70">
                    <ArrowUpRight className="h-3.5 w-3.5" />
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

          {/* Status line — dynamic copy driven by the income/spend ratio */}
          {(hasData || atCurrent) && (
            <div
              className={cn(
                "flex items-center gap-2.5 rounded-[14px] border px-4 py-3 text-[0.86rem]",
                status.tone === "warn"
                  ? "border-negative/30 bg-negative-soft text-negative"
                  : status.tone === "good"
                    ? "border-positive/25 bg-positive-soft text-positive"
                    : "border-border bg-surface-2 text-text-2",
              )}
            >
              {status.tone === "warn" ? (
                <AlertTriangle className="h-4.5 w-4.5 shrink-0" />
              ) : status.tone === "good" ? (
                <TrendingUp className="h-4.5 w-4.5 shrink-0" />
              ) : (
                <Wallet className="h-4.5 w-4.5 shrink-0" />
              )}
              <span className="font-medium">{status.message}</span>
            </div>
          )}

          {needsIncome && (
            <button
              onClick={() => openRecur(null, "income")}
              className="flex w-full items-start gap-3 rounded-[16px] border border-brand/30 bg-brand-soft p-4 text-left"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand/15 text-brand">
                <Wallet className="h-4.5 w-4.5" />
              </span>
              <span className="min-w-0">
                <span className="block text-[0.9rem] font-semibold text-text">Add what you earn</span>
                <span className="block text-[0.78rem] leading-snug text-text-2">
                  You&apos;re logging spending but no income, so nothing here can tell you how you&apos;re really doing.
                  Set your salary up as a repeat and it lands on its own each month.
                </span>
              </span>
            </button>
          )}

          {pending.any && <PendingSplitsCard pending={pending} />}

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


          {/* Repeats */}
          <section>
            <SectionHeader
              title="Repeats"
              action={
                <button onClick={() => openRecur()} className="flex items-center gap-0.5 text-[0.78rem] font-semibold text-brand">
                  <Plus className="h-3.5 w-3.5" /> Add
                </button>
              }
            />
            {recurrings.length > 0 ? (
              <div className="flex flex-col gap-2.5">
                {dueRules.length > 0 && (
                  <button
                    onClick={addAllDue}
                    className="flex items-center gap-3 rounded-[14px] border border-brand/30 bg-brand-soft px-4 py-3 text-left"
                  >
                    <BellRing className="h-4.5 w-4.5 shrink-0 text-brand" />
                    <span className="min-w-0 flex-1 text-[0.84rem] font-medium leading-snug text-brand-on-soft">
                      {dueRules.length === 1 ? "1 repeat is due" : `${dueRules.length} repeats are due`} — tap to add{" "}
                      {dueRules.length === 1 ? "it" : "them"} now.
                    </span>
                  </button>
                )}
                <Card className="overflow-hidden">
                  <div className="divide-y divide-border">
                    {recurrings.map((r) => {
                      const meta = r.type === "income"
                        ? INCOME_CATEGORIES[r.category as IncomeCategory] ?? INCOME_CATEGORIES.other
                        : CATEGORIES[r.category as CategoryKey] ?? CATEGORIES.other;
                      const Icon = meta.icon;
                      const due = isDue(r);
                      const income = r.type === "income";
                      return (
                        <button
                          key={r.id}
                          onClick={() => openRecur(r.id)}
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
                            <div className="flex items-center gap-1.5">
                              <p className="truncate text-[0.9rem] font-medium text-text">{r.note?.trim() || meta.label}</p>
                              {!r.auto && (
                                <span className="shrink-0 rounded-full bg-surface-inset px-1.5 py-0.5 text-[0.58rem] font-bold uppercase tracking-wide text-text-3">
                                  Remind
                                </span>
                              )}
                            </div>
                            <p className="truncate text-[0.76rem] text-text-3">
                              {recurLabel(r)}
                              {due ? (
                                <span className="text-brand"> · due now</span>
                              ) : (
                                ` · next ${formatDate(nextOccurrence(r.freq, r.day).toISOString(), true)}`
                              )}
                            </p>
                          </div>
                          <span className={cn("tnum text-[0.92rem] font-semibold", income ? "text-positive" : "text-text")}>
                            {income ? "+" : "−"}
                            {formatINR(r.amount)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </Card>
              </div>
            ) : (
              <button
                onClick={() => openRecur()}
                className="flex w-full items-center gap-3.5 rounded-[16px] border border-border bg-surface p-4 text-left shadow-[var(--shadow-xs)] transition-all hover:-translate-y-0.5 hover:border-border-strong hover:shadow-[var(--shadow-md)]"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
                  <Repeat className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[0.9rem] font-semibold text-text">Stop typing the same things in</p>
                  <p className="text-[0.76rem] leading-snug text-text-3">
                    Salary, rent, subscriptions — set them up once and Tally logs them for you.
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-text-3" />
              </button>
            )}
          </section>

          {/* Budget */}
          <section>
            <SectionHeader
              title="Budget"
              action={
                bv.hasBudget ? (
                  <button onClick={openBudget} className="text-[0.78rem] font-semibold text-brand">Edit</button>
                ) : undefined
              }
            />
            {bv.hasBudget ? (
              <Card className="flex flex-col gap-4 p-4">
                {bv.monthly > 0 && <BudgetBar label="Monthly budget" spent={bv.spent} limit={bv.monthly} />}
                {bv.categories.length > 0 && (
                  <div className="flex flex-col gap-3">
                    {bv.monthly > 0 && <div className="h-px bg-border" />}
                    {bv.categories.map((c) => (
                      <BudgetBar key={c.category} label={CATEGORIES[c.category].label} spent={c.spent} limit={c.limit} />
                    ))}
                  </div>
                )}
                {bv.over && (
                  <p className="flex items-center gap-1.5 text-[0.8rem] font-medium text-negative">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    {formatINR(bv.spent - bv.monthly)} over your monthly budget.
                  </p>
                )}
                {budgetUnrealistic && (
                  <button onClick={openBudget} className="flex items-start gap-1.5 text-left text-[0.78rem] leading-snug text-text-2">
                    <Target className="mt-px h-3.5 w-3.5 shrink-0 text-text-3" />
                    <span>
                      You&apos;ve averaged {formatINR(suggested)} a month lately. A limit you keep passing stops meaning
                      anything — <b className="text-brand">set it to {formatINR(suggested)}</b>?
                    </span>
                  </button>
                )}
              </Card>
            ) : (
              <Card className="flex flex-col items-center gap-3 p-5 text-center">
                <p className="max-w-[17rem] text-[0.88rem] text-text-2">
                  Set a monthly budget — a limit you choose — and we&apos;ll nudge you before you overspend.
                </p>
                <Button size="sm" onClick={openBudget}>
                  <Target className="h-4 w-4" /> Set a budget
                </Button>
              </Card>
            )}
          </section>

          {/* Emergency-fund dip warning */}
          {ef.set && !ef.funded && (
            <button
              onClick={openEmergency}
              className="flex w-full items-start gap-2.5 rounded-[14px] border border-negative/30 bg-negative-soft px-4 py-3 text-left text-negative"
            >
              <ShieldAlert className="mt-0.5 h-4.5 w-4.5 shrink-0" />
              <p className="text-[0.84rem] font-medium leading-snug">
                Your savings are {formatINR(ef.short)} below your {formatINR(ef.target)} emergency fund. Ease off spending and
                top it back up.
              </p>
            </button>
          )}

          {/* Runway warning — net worth depleting at the current pace */}
          {runway.applicable && (
            <div className="flex items-start gap-2.5 rounded-[14px] border border-negative/30 bg-negative-soft px-4 py-3 text-negative">
              <AlertTriangle className="mt-0.5 h-4.5 w-4.5 shrink-0" />
              <p className="text-[0.84rem] font-medium leading-snug">
                You&apos;re spending {formatINR(runway.burn)}/mo more than you earn. At this pace your net worth reaches ₹0 in about{" "}
                <span className="font-bold">{Math.round(runway.months)} {Math.round(runway.months) === 1 ? "month" : "months"}</span>.
              </p>
            </div>
          )}
        </PageCol>

        <PageCol>
          {/* Net worth & health */}
          <Link
            href="/wealth"
            className="flex items-center gap-3.5 rounded-[16px] border border-border bg-surface p-4 shadow-[var(--shadow-xs)] transition-all hover:-translate-y-0.5 hover:border-border-strong hover:shadow-[var(--shadow-md)]"
          >
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white"
              style={{ background: health.ready ? gradeColor(health.grade) : "var(--brand)" }}
            >
              {health.ready ? (
                <span className="font-display text-lg font-bold">{health.grade}</span>
              ) : (
                <Scale className="h-5 w-5" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[0.9rem] font-semibold text-text">Wealth health</p>
              <p className="text-[0.76rem] text-text-3">
                {health.ready
                  ? `Net worth ${formatINR(nw.net)}`
                  : `Set up your score — ${health.setupDone} of ${health.setupTotal} done`}
              </p>
            </div>
            <ChevronRight className="h-5 w-5 shrink-0 text-text-3" />
          </Link>

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
                          <div className="flex items-center gap-1.5">
                            <p className="truncate text-[0.9rem] font-medium text-text">{e.note?.trim() || label}</p>
                            {e.recurringId && (
                              <Repeat className="h-3 w-3 shrink-0 text-text-3" aria-label="Added by a repeat" />
                            )}
                          </div>
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
        </PageCol>
      </PageGrid>
    </div>
  );
}
