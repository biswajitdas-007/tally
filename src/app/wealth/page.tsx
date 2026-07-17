"use client";

import { useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronLeft, Plus, Wallet, Scale, TrendingUp } from "lucide-react";
import { Card, SectionHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { useStore, useMyId } from "@/store/useStore";
import { useUI } from "@/store/useUI";
import { ACCOUNT_KIND_META, LIABILITY_KIND_META } from "@/lib/categories";
import { healthScore, netWorth, gradeColor } from "@/lib/health";
import { formatINR, cn } from "@/lib/utils";
import type { AccountKind, LiabilityKind } from "@/lib/types";

export default function WealthPage() {
  const finance = useStore((s) => s.finance);
  const expenses = useStore((s) => s.expenses);
  const budget = useStore((s) => s.budget);
  const accounts = useStore((s) => s.accounts);
  const liabilities = useStore((s) => s.liabilities);
  const openWealth = useUI((s) => s.openWealth);
  const myId = useMyId() ?? "";

  const health = useMemo(
    () => healthScore({ finance, expenses, meId: myId, budget, accounts, liabilities }),
    [finance, expenses, myId, budget, accounts, liabilities],
  );
  const nw = useMemo(() => netWorth(accounts, liabilities), [accounts, liabilities]);

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
                <p className="text-[0.72rem] font-semibold uppercase tracking-wide text-text-3">Financial health</p>
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
            nw.net > 0.5 ? "text-positive" : nw.net < -0.5 ? "text-negative" : "text-text",
          )}
        >
          {formatINR(nw.net)}
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <div className="rounded-[14px] bg-surface-inset p-3">
            <div className="flex items-center gap-1.5 text-text-3">
              <TrendingUp className="h-3.5 w-3.5" />
              <span className="text-[0.72rem] font-medium">Assets</span>
            </div>
            <p className="mt-1 tnum text-lg font-bold text-text">{formatINR(nw.assets)}</p>
          </div>
          <div className="rounded-[14px] bg-surface-inset p-3">
            <div className="flex items-center gap-1.5 text-text-3">
              <Scale className="h-3.5 w-3.5" />
              <span className="text-[0.72rem] font-medium">Liabilities</span>
            </div>
            <p className="mt-1 tnum text-lg font-bold text-text">{formatINR(nw.debts)}</p>
          </div>
        </div>
      </Card>

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
        {accounts.length > 0 ? (
          <Card className="overflow-hidden">
            <div className="divide-y divide-border">
              {accounts.map((a) => {
                const Icon = ACCOUNT_KIND_META[a.kind as AccountKind].icon;
                return (
                  <button
                    key={a.id}
                    onClick={() => openWealth("asset", a.id)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-2 active:bg-surface-inset"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-positive-soft text-positive">
                      <Icon className="h-[18px] w-[18px]" />
                    </span>
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
                return (
                  <button
                    key={l.id}
                    onClick={() => openWealth("liability", l.id)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-2 active:bg-surface-inset"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-negative-soft text-negative">
                      <Icon className="h-[18px] w-[18px]" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[0.9rem] font-medium text-text">{l.name}</p>
                      <p className="text-[0.76rem] text-text-3">
                        {LIABILITY_KIND_META[l.kind as LiabilityKind].label}
                        {l.emi ? ` · ${formatINR(l.emi)}/mo` : ""}
                      </p>
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
