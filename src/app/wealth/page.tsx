"use client";

import { useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronLeft, Plus, Wallet, Scale, TrendingUp, CalendarClock, AlertTriangle, Lightbulb, Sparkles, PiggyBank, ChevronRight, Info, type LucideIcon } from "lucide-react";
import { Card, SectionHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useStore, useMyId } from "@/store/useStore";
import { useUI } from "@/store/useUI";
import { ACCOUNT_KIND_META, LIABILITY_KIND_META } from "@/lib/categories";
import { BankBadge } from "@/components/features/bank-badge";
import { healthScore, netWorth, gradeColor, avgMonthly, wealthRunway } from "@/lib/health";
import { debtSuggestions, monthlyLiability, type DebtSuggestion } from "@/lib/debt";
import { withLiveBalances, unparkedAmount } from "@/lib/accounts";
import { formatINR, cn } from "@/lib/utils";
import type { AccountKind, LiabilityKind } from "@/lib/types";

const SUGGESTION_ICON: Record<DebtSuggestion["tone"], LucideIcon> = { warn: AlertTriangle, info: Lightbulb, good: Sparkles };

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
  const openWealth = useUI((s) => s.openWealth);
  const openPark = useUI((s) => s.openPark);
  const openAccountDetail = useUI((s) => s.openAccountDetail);
  const myId = useMyId() ?? "";

  const liveAccounts = useMemo(
    () => withLiveBalances(accounts, finance, expenses, myId),
    [accounts, finance, expenses, myId],
  );
  const unparked = useMemo(() => unparkedAmount(finance, expenses, accounts, myId), [finance, expenses, accounts, myId]);

  const health = useMemo(
    () => healthScore({ finance, expenses, meId: myId, budget, accounts: liveAccounts, liabilities, unparked }),
    [finance, expenses, myId, budget, liveAccounts, liabilities, unparked],
  );
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

      {/* Health score */}
      {health.enough ? (
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
                        <li><b className="text-text">Emergency fund</b> — months of outflow your savings cover</li>
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
                    <div className="flex items-center justify-between text-[0.82rem]">
                      <span className="font-medium text-text">{p.label}</span>
                      <span className="text-text-3">{p.detail}</span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-inset">
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
        <Card className="flex flex-col items-center gap-3 p-6 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-soft text-brand">
            <Scale className="h-6 w-6" />
          </span>
          <p className="max-w-[17rem] text-[0.9rem] text-text-2">
            Add your income, accounts and any loans to get your Financial Health Score.
          </p>
        </Card>
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
        {liveAccounts.length > 0 ? (
          <Card className="overflow-hidden">
            <div className="divide-y divide-border">
              {liveAccounts.map((a) => {
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
            <EmptyState icon={Wallet} title="No accounts yet" description="Add your bank, cash, wallets and investments to track net worth." />
          </Card>
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
    </div>
  );
}
