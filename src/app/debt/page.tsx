"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronLeft, PartyPopper, TrendingDown, AlertTriangle, Sparkles, Flag, Info } from "lucide-react";
import { PageGrid, PageCol } from "@/components/app/page-grid";
import { Card, SectionHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Segmented } from "@/components/ui/segmented";
import { BankBadge } from "@/components/features/bank-badge";
import { LIABILITY_KIND_META } from "@/lib/categories";
import { useStore } from "@/store/useStore";
import { useUI } from "@/store/useUI";
import { buildPlan, comparePayoff, humanMonths, STRATEGY_META, type Strategy } from "@/lib/payoff";
import { monthlyLiability } from "@/lib/debt";
import { formatINR, formatDate, cn , sanitizeMoneyInput} from "@/lib/utils";
import type { LiabilityKind } from "@/lib/types";

const PRESETS = [1000, 2500, 5000, 10000];

export default function DebtPage() {
  const liabilities = useStore((s) => s.liabilities);
  const openWealth = useUI((s) => s.openWealth);

  const [strategy, setStrategy] = useState<Strategy>("avalanche");
  const [extra, setExtra] = useState(0);
  const [specificExtra, setSpecificExtra] = useState<Record<string, number>>({});
  const [foreclosures, setForeclosures] = useState<Set<string>>(new Set());

  const activeLiabilities = useMemo(() => liabilities.filter(l => !foreclosures.has(l.id)), [liabilities, foreclosures]);
  const foreclosedLiabilities = useMemo(() => liabilities.filter(l => foreclosures.has(l.id)), [liabilities, foreclosures]);

  const emiTotal = useMemo(() => monthlyLiability(activeLiabilities), [activeLiabilities]);
  const plan = useMemo(() => buildPlan(activeLiabilities, strategy, extra, specificExtra), [activeLiabilities, strategy, extra, specificExtra]);
  const cmp = useMemo(() => comparePayoff(activeLiabilities, strategy, extra, specificExtra), [activeLiabilities, strategy, extra, specificExtra]);
  // What the other strategy would cost, so the trade-off is visible.
  const other = useMemo(
    () => buildPlan(activeLiabilities, strategy === "avalanche" ? "snowball" : "avalanche", extra, specificExtra),
    [activeLiabilities, strategy, extra, specificExtra],
  );

  const totalOwed = liabilities.reduce((a, l) => a + l.outstanding, 0);

  if (!plan.applicable) {
    return (
      <div className="flex flex-col gap-6">
        <Link href="/wealth" className="-mb-1 flex w-fit items-center gap-1 text-sm font-medium text-text-2 hover:text-text">
          <ChevronLeft className="h-4 w-4" /> Wealth
        </Link>
        <div>
          <h1 className="font-display text-2xl font-bold tracking-[-0.02em]">Debt-free plan</h1>
          <p className="mt-0.5 text-[0.84rem] text-text-3">When you&apos;ll be clear, and what gets you there sooner</p>
        </div>
        <Card>
          {liabilities.length === 0 ? (
            <EmptyState
              icon={PartyPopper}
              title="No debts to plan"
              description="Nothing owed — nothing to pay off. Add a loan on the Wealth page if you'd like to track one."
            />
          ) : (
            <EmptyState
              icon={Info}
              title="Add an EMI to plan a payoff"
              description="Your debts don't have a monthly payment set, so there's nothing to project. Add the EMI and interest rate to each one."
            />
          )}
        </Card>
        {plan.excluded.length > 0 && <ExcludedCard excluded={plan.excluded} onFix={(id) => openWealth("liability", id)} />}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Link href="/wealth" className="-mb-1 flex w-fit items-center gap-1 text-sm font-medium text-text-2 hover:text-text">
        <ChevronLeft className="h-4 w-4" /> Wealth
      </Link>

      <div>
        <h1 className="font-display text-2xl font-bold tracking-[-0.02em]">Debt-free plan</h1>
        <p className="mt-0.5 text-[0.84rem] text-text-3">When you&apos;ll be clear, and what gets you there sooner</p>
      </div>

      <PageGrid>
        <PageCol>
          {/* When you're free */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 240, damping: 26 }}
            className="relative overflow-hidden rounded-[24px] p-5 text-white shadow-[var(--shadow-lg)]"
            style={{ background: "linear-gradient(152deg,#22795d 0%,#185a44 46%,#0f3f2e 100%)" }}
          >
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.14]"
              style={{
                backgroundImage: "repeating-linear-gradient(90deg, rgba(255,255,255,0.6) 0 1px, transparent 1px 27px)",
                maskImage: "linear-gradient(to bottom, transparent, #000 30%, #000 70%, transparent)",
              }}
            />
            <div className="relative">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.1em] text-white/60">Debt-free on</p>
              <p className="mt-1 font-display text-[2.4rem] font-bold leading-none tracking-[-0.03em]">
                {plan.debtFreeOn.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
              </p>
              <p className="mt-1.5 text-[0.86rem] text-white/75">
                {humanMonths(plan.months)} away · paying {formatINR(emiTotal + extra)}/mo
              </p>

              <div className="mt-5 grid grid-cols-2 gap-2.5">
                <div className="rounded-[14px] bg-white/10 p-3 ring-1 ring-white/10">
                  <span className="text-[0.72rem] font-medium text-white/70">You owe</span>
                  <p className="mt-1 font-display text-xl font-bold tnum">{formatINR(totalOwed)}</p>
                </div>
                <div className="rounded-[14px] bg-white/10 p-3 ring-1 ring-white/10">
                  <span className="text-[0.72rem] font-medium text-white/70">Interest to come</span>
                  <p className="mt-1 font-display text-xl font-bold tnum" style={{ color: "#ffc0a6" }}>
                    {formatINR(plan.totalInterest)}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Strategy */}
          <Card className="p-5">
            <p className="mb-2.5 text-[0.72rem] font-semibold uppercase tracking-wide text-text-3">Which order</p>
            <Segmented<Strategy>
              value={strategy}
              onChange={setStrategy}
              className="w-full"
              options={[
                { value: "avalanche", label: STRATEGY_META.avalanche.label },
                { value: "snowball", label: STRATEGY_META.snowball.label },
              ]}
            />
            <p className="mt-2.5 text-[0.82rem] leading-snug text-text-2">{STRATEGY_META[strategy].blurb}</p>
            {other.applicable && other.totalInterest !== plan.totalInterest && (
              <p className="mt-2 flex items-start gap-1.5 text-[0.78rem] leading-snug text-text-3">
                <Info className="mt-px h-3.5 w-3.5 shrink-0" />
                {plan.totalInterest < other.totalInterest ? (
                  <>
                    This saves {formatINR(other.totalInterest - plan.totalInterest)} against the other order.
                  </>
                ) : (
                  <>
                    Costs {formatINR(plan.totalInterest - other.totalInterest)} more than{" "}
                    {STRATEGY_META[strategy === "avalanche" ? "snowball" : "avalanche"].label.toLowerCase()} — worth it if
                    ticking debts off keeps you going.
                  </>
                )}
              </p>
            )}
          </Card>

          {/* Pay a bit more */}
          <Card className="p-5">
            <p className="text-[0.72rem] font-semibold uppercase tracking-wide text-text-3">Pay a bit more each month</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={() => setExtra(0)}
                className={cn(
                  "rounded-full border px-3.5 py-2 text-[0.82rem] font-medium transition-all",
                  extra === 0
                    ? "border-transparent bg-brand-soft text-brand-on-soft"
                    : "border-border bg-surface text-text-2 hover:border-border-strong",
                )}
              >
                Nothing extra
              </button>
              {PRESETS.map((p) => (
                <button
                  key={p}
                  onClick={() => setExtra(p)}
                  className={cn(
                    "rounded-full border px-3.5 py-2 text-[0.82rem] font-medium tnum transition-all",
                    extra === p
                      ? "border-transparent bg-brand-soft text-brand-on-soft"
                      : "border-border bg-surface text-text-2 hover:border-border-strong",
                  )}
                >
                  +{formatINR(p)}
                </button>
              ))}
            </div>

            <div className="mt-3 flex items-center gap-2 rounded-[14px] border border-border bg-surface px-4 py-3">
              <span className="font-display text-lg font-semibold text-text-2">₹</span>
              <input
                value={extra || ""}
                onChange={(e) => setExtra(parseFloat(sanitizeMoneyInput(e.target.value)) || 0)}
                inputMode="decimal"
                placeholder="Your own amount"
                className="flex-1 bg-transparent font-display text-lg font-bold tnum outline-none placeholder:text-[0.9rem] placeholder:font-medium placeholder:text-text-3"
              />
            </div>

            {extra > 0 && (
              <div className="mt-3 flex items-start gap-2.5 rounded-[14px] border border-positive/25 bg-positive-soft px-4 py-3 text-positive">
                <Sparkles className="mt-0.5 h-4.5 w-4.5 shrink-0" />
                <p className="text-[0.84rem] font-medium leading-snug">
                  {cmp.monthsSaved > 0 ? (
                    <>
                      Debt-free <b>{humanMonths(cmp.monthsSaved)} sooner</b>
                      {cmp.interestSaved > 0 && <> and {formatINR(cmp.interestSaved)} less interest</>}.
                    </>
                  ) : cmp.interestSaved > 0 ? (
                    <>Saves {formatINR(cmp.interestSaved)} in interest.</>
                  ) : (
                    <>Every extra rupee goes straight at the principal.</>
                  )}
                </p>
              </div>
            )}
          </Card>
        </PageCol>

        <PageCol>
          {plan.excluded.length > 0 && <ExcludedCard excluded={plan.excluded} onFix={(id) => openWealth("liability", id)} />}

          {/* The order */}
          <section>
            <SectionHeader title="The order to clear them" />
            <Card className="overflow-hidden">
              <div className="divide-y divide-border">
                {plan.order.map((d, i) => {
                  const kind = liabilities.find((l) => l.id === d.id)?.kind ?? "loan";
                  const Icon = LIABILITY_KIND_META[kind as LiabilityKind].icon;
                  const first = i === 0;
                  return (
                    <div key={d.id} className="flex flex-col gap-2 px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="relative shrink-0">
                          <BankBadge name={d.lender ?? d.name} fallback={Icon} tone={first ? "positive" : "negative"} className="h-9 w-9" />
                          <span
                            className={cn(
                              "absolute -left-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full text-[0.58rem] font-bold",
                              first ? "bg-brand text-on-brand" : "bg-surface-inset text-text-3",
                            )}
                          >
                            {i + 1}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <p className="truncate text-[0.9rem] font-medium text-text">{d.name}</p>
                            {first && (
                              <span className="flex shrink-0 items-center gap-0.5 rounded-full bg-brand-soft px-1.5 py-0.5 text-[0.58rem] font-bold uppercase tracking-wide text-brand">
                                <Flag className="h-2.5 w-2.5" /> First
                              </span>
                            )}
                          </div>
                          <p className="truncate text-[0.76rem] text-text-3">
                            {formatINR(d.outstanding)}
                            {d.rate > 0 && ` · ${d.rate}%`} · clear by {formatDate(d.clearedOn.toISOString(), true)}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="tnum text-[0.82rem] font-semibold text-text">{humanMonths(d.months)}</p>
                          {d.interest > 0 && (
                            <p className="flex items-center justify-end gap-0.5 text-[0.72rem] text-text-3">
                              <TrendingDown className="h-3 w-3" />
                              {formatINR(d.interest)}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] bg-surface-inset px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[0.76rem] font-medium text-text-2">Pay extra:</span>
                          <div className="flex h-8 items-center rounded-[8px] border border-border bg-surface px-2 focus-within:border-brand">
                            <span className="text-[0.8rem] text-text-3">₹</span>
                            <input
                              value={specificExtra[d.id] || ""}
                              onChange={(e) => setSpecificExtra((p) => ({ ...p, [d.id]: parseFloat(sanitizeMoneyInput(e.target.value)) || 0 }))}
                              inputMode="decimal"
                              placeholder="0"
                              className="w-16 bg-transparent px-1 font-display text-[0.85rem] font-semibold outline-none"
                            />
                          </div>
                        </div>
                        <label className="flex cursor-pointer items-center gap-1.5">
                          <input
                            type="checkbox"
                            checked={false}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setForeclosures((p) => new Set([...p, d.id]));
                                setSpecificExtra((p) => { const next = {...p}; delete next[d.id]; return next; });
                              }
                            }}
                            className="h-3.5 w-3.5 rounded-[4px] accent-brand"
                          />
                          <span className="text-[0.76rem] font-medium text-text-2">Foreclose now</span>
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            {foreclosedLiabilities.length > 0 && (
              <Card className="mt-4 overflow-hidden border-positive/30 bg-positive-soft/10">
                <div className="px-4 py-3 border-b border-positive/10">
                  <p className="text-[0.82rem] font-semibold text-positive">Planned Foreclosures</p>
                  <p className="text-[0.72rem] text-positive/70">These are paid off today.</p>
                </div>
                <div className="divide-y divide-positive/10">
                  {foreclosedLiabilities.map((l) => {
                    const Icon = LIABILITY_KIND_META[l.kind as LiabilityKind].icon;
                    return (
                      <div key={l.id} className="flex flex-col gap-2 px-4 py-3">
                        <div className="flex items-center gap-3">
                          <BankBadge name={l.lender ?? l.name} fallback={Icon} tone="positive" className="h-9 w-9 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[0.9rem] font-medium text-text">{l.name}</p>
                            <p className="truncate text-[0.76rem] text-text-3">Foreclosing with {formatINR(l.outstanding)}</p>
                          </div>
                          <button
                            onClick={() => {
                                setForeclosures((p) => { const next = new Set(p); next.delete(l.id); return next; });
                            }}
                            className="rounded-full bg-surface px-3 py-1.5 text-[0.72rem] font-medium text-text-2 ring-1 ring-border transition-colors hover:text-text hover:ring-border-strong"
                          >
                            Undo
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}
            <p className="mt-2 px-0.5 text-[0.76rem] leading-snug text-text-3">
              Each EMI keeps running. When one debt clears, its payment rolls into the next — which is why the last ones go
              fastest.
            </p>
          </section>
        </PageCol>
      </PageGrid>
    </div>
  );
}

function ExcludedCard({
  excluded,
  onFix,
}: {
  excluded: { id: string; name: string; reason: "no-emi" | "never-clears" }[];
  onFix: (id: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2.5 rounded-[16px] border border-negative/30 bg-negative-soft p-4 text-negative">
      <div className="flex items-start gap-2.5">
        <AlertTriangle className="mt-0.5 h-4.5 w-4.5 shrink-0" />
        <p className="text-[0.86rem] font-semibold">Not in the plan</p>
      </div>
      {excluded.map((e) => (
        <button key={e.id} onClick={() => onFix(e.id)} className="rounded-[12px] bg-negative/10 px-3 py-2 text-left">
          <p className="text-[0.84rem] font-medium">{e.name}</p>
          <p className="text-[0.78rem] leading-snug opacity-90">
            {e.reason === "no-emi"
              ? "No monthly payment set — add its EMI to include it."
              : "The EMI doesn't cover the monthly interest, so this balance never falls. Pay more than the interest, or refinance."}
          </p>
        </button>
      ))}
    </div>
  );
}
