"use client";

import { useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronLeft, Plus, Check, Wallet, Scale, TrendingUp, TrendingDown, CalendarClock, AlertTriangle, Lightbulb, Sparkles, PiggyBank, ChevronRight, Info, ShieldCheck, ShieldAlert, Pencil, LineChart, type LucideIcon } from "lucide-react";
import { PageGrid, PageCol } from "@/components/app/page-grid";
import { Card, SectionHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useStore, useMyId } from "@/store/useStore";
import { useUI } from "@/store/useUI";
import { ACCOUNT_KIND_META, INVESTMENT_TYPE_META, LIABILITY_KIND_META } from "@/lib/categories";
import { BankBadge } from "@/components/features/bank-badge";
import { healthScore, netWorth, gradeColor, avgMonthly, wealthRunway, emergencyStatus, type SetupKey } from "@/lib/health";
import { investmentTotals, holdingGain } from "@/lib/investments";
import { debtSuggestions, monthlyLiability, type DebtSuggestion } from "@/lib/debt";
import { withLiveBalances, unparkedAmount } from "@/lib/accounts";
import { formatINR, cn } from "@/lib/utils";
import type { AccountKind, InvestmentType, LiabilityKind } from "@/lib/types";

const SUGGESTION_ICON: Record<DebtSuggestion["tone"], LucideIcon> = { warn: AlertTriangle, info: Lightbulb, good: Sparkles };

/** What each unfinished setup step offers to do. */
const SETUP_ACTION: Record<SetupKey, { cta: string }> = {
  income: { cta: "Add" },
  spending: { cta: "Add" },
  accounts: { cta: "Add" },
  emergency: { cta: "Set" },
};

function SuggestionCard({ s }: { s: DebtSuggestion }) {
  const Icon = SUGGESTION_ICON[s.tone];
  const styles =
    s.tone === "warn"
      ? "bg-negative-soft text-negative"
      : s.tone === "good"
        ? "bg-positive-soft text-positive"
        : "bg-brand-soft text-brand";
  return (
    <div className="flex gap-3 rounded-[15px] border border-border bg-surface p-3.5 shadow-[var(--shadow-xs)]">
      <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full", styles)}>
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <div className="min-w-0">
        <p className="text-[0.88rem] font-semibold leading-snug text-text">{s.title}</p>
        <p className="mt-0.5 text-[0.8rem] leading-snug text-text-2">{s.detail}</p>
      </div>
    </div>
  );
}

export default function WealthPage() {
  const finance = useStore((s) => s.finance);
  const expenses = useStore((s) => s.expenses);
  const budget = useStore((s) => s.budget);
  const accounts = useStore((s) => s.accounts);
  const liabilities = useStore((s) => s.liabilities);
  const emergency = useStore((s) => s.emergency);
  const openWealth = useUI((s) => s.openWealth);
  const openPark = useUI((s) => s.openPark);
  const openAccountDetail = useUI((s) => s.openAccountDetail);
  const openEmergency = useUI((s) => s.openEmergency);
  const openInvest = useUI((s) => s.openInvest);
  const openMoney = useUI((s) => s.openMoney);
  const myId = useMyId() ?? "";

  function runSetup(key: SetupKey) {
    if (key === "income") openMoney("income");
    else if (key === "spending") openMoney("expense");
    else if (key === "accounts") openWealth("asset");
    else openEmergency();
  }

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
  const cashAccounts = useMemo(() => liveAccounts.filter((a) => a.kind !== "investment"), [liveAccounts]);
  const investList = useMemo(() => liveAccounts.filter((a) => a.kind === "investment"), [liveAccounts]);
  const invTotals = useMemo(() => investmentTotals(liveAccounts), [liveAccounts]);
  const nwBase = useMemo(() => netWorth(liveAccounts, liabilities), [liveAccounts, liabilities]);
  const assets = nwBase.assets + unparked;
  const netTotal = assets - nwBase.debts;

  const avg = useMemo(() => avgMonthly(finance, expenses, myId), [finance, expenses, myId]);
  const income = avg.income;
  const runway = useMemo(
    () => wealthRunway({ finance, expenses, meId: myId, accounts: liveAccounts, liabilities, unparked }),
    [finance, expenses, myId, liveAccounts, liabilities, unparked],
  );
  const emiTotal = useMemo(() => monthlyLiability(liabilities), [liabilities]);
  const liquid = liveAccounts.filter((a) => a.kind !== "investment").reduce((s, a) => s + a.balance, 0) + unparked;
  const dti = income > 0 ? emiTotal / income : 0;
  const suggestions = useMemo(
    () => debtSuggestions({ liabilities, income, spend: avg.spend, liquid }),
    [liabilities, income, avg.spend, liquid],
  );
  const dtiStyle =
    dti >= 0.4
      ? { background: "var(--negative-soft)", color: "var(--negative)" }
      : dti >= 0.2
        ? { background: "color-mix(in srgb, var(--warn) 16%, transparent)", color: "var(--warn)" }
        : { background: "var(--positive-soft)", color: "var(--positive)" };

  return (
    <div className="flex flex-col gap-6">
      <Link href="/money" className="-mb-1 flex w-fit items-center gap-1 text-sm font-medium text-text-2 hover:text-text">
        <ChevronLeft className="h-4 w-4" /> Money
      </Link>

      <div>
        <h1 className="font-display text-2xl font-bold tracking-[-0.02em]">Wealth health</h1>
        <p className="mt-0.5 text-[0.84rem] text-text-3">Your net worth and a score for how your finances are doing</p>
      </div>

      <PageGrid>
        <PageCol>
          {/* Health score — a grade only once it can mean something */}
          {health.ready ? (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 240, damping: 26 }}
            >
              <Card className="p-5">
                <div className="flex items-center gap-4">
                  <div
                    className="flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-full text-white"
                    style={{ background: gradeColor(health.grade) }}
                  >
                    <span className="font-display text-3xl font-bold leading-none">{health.grade}</span>
                    <span className="text-[0.66rem] font-semibold opacity-90">{health.score}/100</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="text-[0.72rem] font-semibold uppercase tracking-wide text-text-3">Financial health</p>
                      <Popover>
                        <PopoverTrigger
                          render={
                            <button
                              aria-label="How this is calculated"
                              className="flex h-4 w-4 items-center justify-center text-text-3 transition-colors hover:text-text-2"
                            >
                              <Info className="h-3.5 w-3.5" />
                            </button>
                          }
                        />
                        <PopoverContent align="start" className="w-[17rem] p-3.5 text-[0.78rem] leading-relaxed text-text-2">
                          <p className="mb-1.5 font-semibold text-text">How your score works</p>
                          <p>It totals five checks out of 100 — each bar below is one of them:</p>
                          <ul className="mt-1.5 flex list-disc flex-col gap-1 pl-4">
                            <li><b className="text-text">Savings rate</b> — income minus everything you spend, <i>including EMIs</i></li>
                            <li><b className="text-text">Debt-to-income</b> — EMIs vs your income</li>
                            <li><b className="text-text">Emergency fund</b> — how close your buffer is to the target you set</li>
                            <li><b className="text-text">Within means</b> — income covers your monthly outflow</li>
                            <li><b className="text-text">Net worth</b> — savings vs a year of income</li>
                          </ul>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <p className="mt-0.5 text-[0.92rem] font-medium leading-snug text-text">{health.nudge}</p>
                  </div>
                </div>

                <div className="mt-5 flex flex-col gap-3">
                  {health.pillars.map((p) => {
                    const pct = p.max > 0 ? (p.score / p.max) * 100 : 0;
                    const color = pct >= 66 ? "var(--positive)" : pct >= 33 ? "var(--warn)" : "var(--negative)";
                    return (
                      <div key={p.key}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-[0.86rem] font-medium text-text">{p.label}</p>
                            <p className="text-[0.72rem] leading-tight text-text-3">{p.hint}</p>
                          </div>
                          <span className="shrink-0 pt-0.5 text-[0.82rem] font-semibold text-text-2">{p.detail}</span>
                        </div>
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-inset">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {!health.confident && (
                  <p className="mt-4 rounded-[12px] bg-surface-inset px-3 py-2.5 text-[0.78rem] leading-snug text-text-2">
                    Log your income and a few expenses each month so this score reflects your real cashflow.
                  </p>
                )}
              </Card>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 240, damping: 26 }}
            >
              <Card className="p-5">
                <div className="flex items-center gap-4">
                  <div className="relative flex h-20 w-20 shrink-0 items-center justify-center">
                    <svg viewBox="0 0 80 80" className="absolute inset-0 -rotate-90">
                      <circle cx="40" cy="40" r="34" fill="none" stroke="var(--surface-inset)" strokeWidth="9" />
                      <circle
                        cx="40"
                        cy="40"
                        r="34"
                        fill="none"
                        stroke="var(--brand)"
                        strokeWidth="9"
                        strokeLinecap="round"
                        strokeDasharray={`${(health.setupDone / health.setupTotal) * 2 * Math.PI * 34} ${2 * Math.PI * 34}`}
                        className="transition-all duration-500"
                      />
                    </svg>
                    <span className="relative font-display text-[1.35rem] font-bold leading-none text-text">
                      {health.setupDone}
                      <span className="text-[0.9rem] text-text-3">/{health.setupTotal}</span>
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[0.72rem] font-semibold uppercase tracking-wide text-text-3">Financial health</p>
                    <p className="mt-0.5 text-[0.92rem] font-medium leading-snug text-text">
                      Finish setting up and we&apos;ll score your finances.
                    </p>
                    <p className="mt-1 text-[0.78rem] leading-snug text-text-3">
                      A grade now would measure how much you&apos;ve typed in, not how your money is doing.
                    </p>
                  </div>
                </div>

                <div className="mt-5 flex flex-col gap-2">
                  {health.setup.map((step) => {
                    const action = SETUP_ACTION[step.key];
                    return (
                      <button
                        key={step.key}
                        onClick={() => runSetup(step.key)}
                        disabled={step.done}
                        className={cn(
                          "flex items-center gap-3 rounded-[13px] border px-3.5 py-2.5 text-left transition-all",
                          step.done
                            ? "border-transparent bg-surface-inset"
                            : "border-border bg-surface hover:-translate-y-0.5 hover:border-border-strong hover:shadow-[var(--shadow-sm)]",
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border",
                            step.done ? "border-transparent bg-positive text-white" : "border-border-strong text-text-3",
                          )}
                        >
                          {step.done ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : <Plus className="h-3.5 w-3.5" />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span
                            className={cn(
                              "block text-[0.88rem] font-medium",
                              step.done ? "text-text-3 line-through" : "text-text",
                            )}
                          >
                            {step.label}
                          </span>
                          {!step.done && <span className="block text-[0.74rem] leading-snug text-text-3">{step.hint}</span>}
                        </span>
                        {!step.done && (
                          <span className="shrink-0 text-[0.76rem] font-semibold text-brand">{action.cta}</span>
                        )}
                      </button>
                    );
                  })}
                </div>

                <p className="mt-4 rounded-[12px] bg-surface-inset px-3 py-2.5 text-[0.78rem] leading-snug text-text-2">
                  The last one is optional — but an emergency fund is the single best thing to sort out early.
                </p>
              </Card>
            </motion.div>
          )}

          {/* Net worth */}
          <Card className="p-5">
            <p className="text-[0.72rem] font-semibold uppercase tracking-wide text-text-3">Net worth</p>
            <p
              className={cn(
                "mt-0.5 font-display text-[2.2rem] font-bold leading-none tracking-[-0.03em] tnum",
                netTotal > 0.5 ? "text-positive" : netTotal < -0.5 ? "text-negative" : "text-text",
              )}
            >
              {formatINR(netTotal)}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2.5">
              <div className="rounded-[14px] bg-surface-inset p-3">
                <div className="flex items-center gap-1.5 text-text-3">
                  <TrendingUp className="h-3.5 w-3.5" />
                  <span className="text-[0.72rem] font-medium">Assets</span>
                </div>
                <p className="mt-1 tnum text-lg font-bold text-text">{formatINR(assets)}</p>
              </div>
              <div className="rounded-[14px] bg-surface-inset p-3">
                <div className="flex items-center gap-1.5 text-text-3">
                  <Scale className="h-3.5 w-3.5" />
                  <span className="text-[0.72rem] font-medium">Liabilities</span>
                </div>
                <p className="mt-1 tnum text-lg font-bold text-text">{formatINR(nwBase.debts)}</p>
              </div>
            </div>
          </Card>

          {/* Emergency fund */}
          {ef.set ? (
            <Card className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full",
                      ef.funded ? "bg-positive-soft text-positive" : "bg-negative-soft text-negative",
                    )}
                  >
                    {ef.funded ? <ShieldCheck className="h-4.5 w-4.5" /> : <ShieldAlert className="h-4.5 w-4.5" />}
                  </span>
                  <p className="text-[0.72rem] font-semibold uppercase tracking-wide text-text-3">Emergency fund</p>
                </div>
                <button onClick={openEmergency} className="flex items-center gap-1 text-[0.78rem] font-semibold text-brand">
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </button>
              </div>
              <div className="mt-2.5 flex items-baseline gap-2">
                <span
                  className={cn(
                    "font-display text-[1.9rem] font-bold leading-none tracking-[-0.02em] tnum",
                    ef.funded ? "text-text" : "text-negative",
                  )}
                >
                  {formatINR(ef.coverage)}
                </span>
                <span className="text-[0.82rem] text-text-3">of {formatINR(ef.target)}</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-inset">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${Math.round(ef.pct * 100)}%`, background: ef.funded ? "var(--positive)" : "var(--negative)" }}
                />
              </div>
              <p className={cn("mt-2.5 text-[0.82rem] font-medium leading-snug", ef.funded ? "text-positive" : "text-negative")}>
                {ef.funded
                  ? "Fully funded — you're covered. Anything extra can go toward investing."
                  : `${formatINR(ef.short)} below your target. Top this up before spending or investing more.`}
              </p>
            </Card>
          ) : (
            <button
              onClick={openEmergency}
              className="flex items-center gap-3.5 rounded-[16px] border border-border bg-surface p-4 text-left shadow-[var(--shadow-xs)] transition-all hover:-translate-y-0.5 hover:border-border-strong hover:shadow-[var(--shadow-md)]"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[0.9rem] font-semibold text-text">Set up an emergency fund</p>
                <p className="text-[0.76rem] leading-snug text-text-3">
                  Keep 3–6 months of expenses safe before you invest — tap to set a target.
                </p>
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-text-3" />
            </button>
          )}

          {/* Runway — net worth depleting at the current pace */}
          {runway.applicable && (
            <div className="flex items-start gap-3 rounded-[16px] border border-negative/30 bg-negative-soft p-4 text-negative">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-negative/15">
                <AlertTriangle className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-[0.9rem] font-semibold">Your wealth is shrinking</p>
                <p className="mt-0.5 text-[0.82rem] leading-snug">
                  You&apos;re spending about {formatINR(runway.outflow)}/mo (including EMIs) but earning {formatINR(runway.income)}. At this
                  pace your net worth reaches ₹0 in about{" "}
                  <b>
                    {Math.round(runway.months)} {Math.round(runway.months) === 1 ? "month" : "months"}
                  </b>
                  . Trim spending or lift income to change course.
                </p>
              </div>
            </div>
          )}

        </PageCol>

        <PageCol>
          {/* Unparked money */}
          {unparked > 0.5 && (
            <button
              onClick={openPark}
              className="flex items-center gap-3.5 rounded-[16px] border border-border bg-surface p-4 text-left shadow-[var(--shadow-xs)] transition-all hover:-translate-y-0.5 hover:border-border-strong hover:shadow-[var(--shadow-md)]"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
                <PiggyBank className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[0.9rem] font-semibold text-text">Unparked money</p>
                <p className="text-[0.76rem] text-text-3">
                  {formatINR(unparked)} received but not in an account yet — tap to park it.
                </p>
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-text-3" />
            </button>
          )}

          {/* Monthly commitments */}
          {emiTotal > 0 && (
            <Card className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-inset text-text-2">
                  <CalendarClock className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-[0.72rem] font-semibold uppercase tracking-wide text-text-3">Monthly EMIs</p>
                  <p className="mt-0.5 font-display text-xl font-bold tnum text-text">{formatINR(emiTotal)}</p>
                </div>
              </div>
              {income > 0 && (
                <span className="rounded-full px-2.5 py-1 text-[0.76rem] font-semibold" style={dtiStyle}>
                  {Math.round(dti * 100)}% of income
                </span>
              )}
            </Card>
          )}

          {/* Suggestions */}
          {suggestions.length > 0 && (
            <section>
              <SectionHeader title="Suggestions" />
              <div className="flex flex-col gap-2.5">
                {suggestions.map((s) => (
                  <SuggestionCard key={s.key} s={s} />
                ))}
              </div>
            </section>
          )}

          {/* Accounts */}
          <section>
            <SectionHeader
              title="Accounts"
              action={
                <button onClick={() => openWealth("asset")} className="flex items-center gap-0.5 text-[0.78rem] font-semibold text-brand">
                  <Plus className="h-3.5 w-3.5" /> Add
                </button>
              }
            />
            {cashAccounts.length > 0 ? (
              <Card className="overflow-hidden">
                <div className="divide-y divide-border">
                  {cashAccounts.map((a) => {
                    const Icon = ACCOUNT_KIND_META[a.kind as AccountKind].icon;
                    return (
                      <button
                        key={a.id}
                        onClick={() => openAccountDetail(a.id)}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-2 active:bg-surface-inset"
                      >
                        <BankBadge name={a.name} fallback={Icon} tone="positive" className="h-9 w-9" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[0.9rem] font-medium text-text">{a.name}</p>
                          <p className="text-[0.76rem] text-text-3">{ACCOUNT_KIND_META[a.kind as AccountKind].label}</p>
                        </div>
                        <span className="tnum text-[0.92rem] font-semibold text-text">{formatINR(a.balance)}</span>
                      </button>
                    );
                  })}
                </div>
              </Card>
            ) : (
              <Card>
                <EmptyState icon={Wallet} title="No accounts yet" description="Add your bank, cash and wallets to track net worth." />
              </Card>
            )}
          </section>

          {/* Investments */}
          <section>
            <SectionHeader
              title="Investments"
              action={
                <button onClick={() => openInvest()} className="flex items-center gap-0.5 text-[0.78rem] font-semibold text-brand">
                  <Plus className="h-3.5 w-3.5" /> Add
                </button>
              }
            />
            {investList.length > 0 ? (
              <Card className="overflow-hidden">
                <div className="flex items-center justify-between border-b border-border px-4 py-3.5">
                  <div className="min-w-0">
                    <p className="text-[0.72rem] font-semibold uppercase tracking-wide text-text-3">Portfolio value</p>
                    <p className="mt-0.5 font-display text-xl font-bold tnum text-text">{formatINR(invTotals.value)}</p>
                  </div>
                  {invTotals.hasCost && (
                    <span
                      className={cn(
                        "flex items-center gap-1 rounded-full px-2.5 py-1 text-[0.76rem] font-semibold",
                        invTotals.gain >= 0 ? "bg-positive-soft text-positive" : "bg-negative-soft text-negative",
                      )}
                    >
                      {invTotals.gain >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                      {invTotals.gain >= 0 ? "+" : "−"}
                      {formatINR(Math.abs(invTotals.gain))} ({Math.abs(Math.round(invTotals.gainPct * 100))}%)
                    </span>
                  )}
                </div>
                <div className="divide-y divide-border">
                  {investList.map((a) => {
                    const meta = INVESTMENT_TYPE_META[(a.investmentType ?? "other") as InvestmentType];
                    const Icon = meta.icon;
                    const g = holdingGain(a);
                    return (
                      <button
                        key={a.id}
                        onClick={() => openInvest(a.id)}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-2 active:bg-surface-inset"
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
                          <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[0.9rem] font-medium text-text">{a.name}</p>
                          <p className="truncate text-[0.76rem] text-text-3">
                            {meta.label}
                            {g && (
                              <span className={g.pct >= 0 ? "text-positive" : "text-negative"}>
                                {" · "}
                                {g.pct >= 0 ? "+" : "−"}
                                {Math.abs(Math.round(g.pct * 100))}%
                              </span>
                            )}
                          </p>
                        </div>
                        <span className="tnum text-[0.92rem] font-semibold text-text">{formatINR(a.balance)}</span>
                      </button>
                    );
                  })}
                </div>
              </Card>
            ) : (
              <button
                onClick={() => openInvest()}
                className="flex w-full items-center gap-3.5 rounded-[16px] border border-border bg-surface p-4 text-left shadow-[var(--shadow-xs)] transition-all hover:-translate-y-0.5 hover:border-border-strong hover:shadow-[var(--shadow-md)]"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
                  <LineChart className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[0.9rem] font-semibold text-text">Track your investments</p>
                  <p className="text-[0.76rem] leading-snug text-text-3">
                    Add SIPs, stocks, mutual funds, FDs and more — they count toward your net worth.
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-text-3" />
              </button>
            )}
          </section>

          {/* Liabilities */}
          <section>
            <SectionHeader
              title="Loans & liabilities"
              action={
                <button onClick={() => openWealth("liability")} className="flex items-center gap-0.5 text-[0.78rem] font-semibold text-brand">
                  <Plus className="h-3.5 w-3.5" /> Add
                </button>
              }
            />
            {liabilities.length > 0 ? (
              <Card className="overflow-hidden">
                <div className="divide-y divide-border">
                  {liabilities.map((l) => {
                    const Icon = LIABILITY_KIND_META[l.kind as LiabilityKind].icon;
                    const meta = [
                      l.lender,
                      l.termMonths ? `${l.emisPaid ?? 0}/${l.termMonths} EMIs paid` : null,
                      l.emi ? `${formatINR(l.emi)}/mo` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ");
                    return (
                      <button
                        key={l.id}
                        onClick={() => openWealth("liability", l.id)}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-2 active:bg-surface-inset"
                      >
                        <BankBadge name={l.lender ?? l.name} fallback={Icon} tone="negative" className="h-9 w-9" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <p className="truncate text-[0.9rem] font-medium text-text">{l.name}</p>
                            {l.autoDebit && (
                              <span className="shrink-0 rounded-full bg-brand-soft px-1.5 py-0.5 text-[0.58rem] font-bold uppercase tracking-wide text-brand">
                                Auto
                              </span>
                            )}
                          </div>
                          <p className="truncate text-[0.76rem] text-text-3">{meta || LIABILITY_KIND_META[l.kind as LiabilityKind].label}</p>
                        </div>
                        <span className="tnum text-[0.92rem] font-semibold text-text">{formatINR(l.outstanding)}</span>
                      </button>
                    );
                  })}
                </div>
              </Card>
            ) : (
              <Card>
                <EmptyState icon={Scale} title="No liabilities" description="Add loans, EMIs or card balances to see your true net worth." />
              </Card>
            )}
          </section>
        </PageCol>
      </PageGrid>
    </div>
  );
}
