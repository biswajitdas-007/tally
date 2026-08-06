"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronLeft, PartyPopper, TrendingDown, AlertTriangle, Sparkles, Flag, Info, Save, Check } from "lucide-react";
import { PageGrid, PageCol } from "@/components/app/page-grid";
import { Card, SectionHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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

  const debtPlan = useStore((s) => s.debtPlan);
  const setWealth = useStore((s) => s.setWealth);
  
  const [strategy, setStrategy] = useState<Strategy>(debtPlan?.strategy ?? "avalanche");
  const [extra, setExtra] = useState(debtPlan?.extra ?? 0);
  const [specificExtra, setSpecificExtra] = useState<Record<string, number>>(debtPlan?.specificExtra ?? {});

  const activeLiabilities = useMemo(() => liabilities.filter(l => !l.foreclosed), [liabilities]);
  const foreclosedLiabilities = useMemo(() => liabilities.filter(l => l.foreclosed), [liabilities]);

  const emiTotal = useMemo(() => monthlyLiability(activeLiabilities), [activeLiabilities]);
  const plan = useMemo(() => buildPlan(activeLiabilities, strategy, extra, specificExtra), [activeLiabilities, strategy, extra, specificExtra]);
  const cmp = useMemo(() => comparePayoff(activeLiabilities, strategy, extra, specificExtra), [activeLiabilities, strategy, extra, specificExtra]);
  // What the other strategy would cost, so the trade-off is visible.
  const other = useMemo(
    () => buildPlan(activeLiabilities, strategy === "avalanche" ? "snowball" : "avalanche", extra, specificExtra),
    [activeLiabilities, strategy, extra, specificExtra],
  );

  const targetLoan = plan?.order?.[0] ? liabilities.find((l) => l.id === plan.order[0].id) : null;
  const targetName = targetLoan?.lender || targetLoan?.name || "your highest priority loan";

  const totalOwed = liabilities.reduce((a, l) => a + l.outstanding, 0);

  const hasUnsavedChanges = 
    strategy !== (debtPlan?.strategy ?? "avalanche") || 
    extra !== (debtPlan?.extra ?? 0) || 
    JSON.stringify(specificExtra) !== JSON.stringify(debtPlan?.specificExtra ?? {});

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
          <Card className="flex flex-col gap-5 p-5">
            <div>
              <SectionHeader title="Pay a bit more each month" />
              <p className="mt-1 text-[0.84rem] text-text-3">
                This global extra amount is automatically applied to your targeted loan (<strong className="text-text-2">{targetName}</strong>) to accelerate your payoff.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
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

            <div className="flex items-center gap-2 rounded-[14px] border border-border bg-surface px-4 py-3">
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
              <div className="mt-1 flex items-start gap-2.5 rounded-[14px] border border-positive/25 bg-positive-soft px-4 py-3 text-positive">
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

          {/* Save Strategy */}
          <Button
            size="lg"
            fullWidth
            variant={hasUnsavedChanges || !debtPlan ? "primary" : "secondary"}
            disabled={!hasUnsavedChanges}
            onClick={() => setWealth({ debtPlan: { strategy, extra, specificExtra } })}
          >
            {hasUnsavedChanges || !debtPlan ? <><Save className="h-[18px] w-[18px]" /> Save Strategy</> : <><Check className="h-[18px] w-[18px]" /> Strategy Saved</>}
          </Button>
        </PageCol>

        <PageCol>
          {plan.excluded.length > 0 && <ExcludedCard excluded={plan.excluded} onFix={(id) => openWealth("liability", id)} />}

          {/* The order */}
          <section>
          <Card className="p-1 pb-4">
            <div className="mb-2 flex items-center justify-between px-5 pt-4">
              <p className="text-[0.68rem] font-bold uppercase tracking-widest text-text-3">The order to clear them</p>
            </div>
            <div className="flex flex-col">
              {plan.order.map((d, index) => {
                const isTarget = index === 0;
                const Icon = LIABILITY_KIND_META[liabilities.find(l => l.id === d.id)?.kind as LiabilityKind].icon;
                return (
                  <div key={d.id} className="relative flex flex-col gap-4 border-b border-border/60 px-5 py-4 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="relative shrink-0">
                        <BankBadge name={d.lender ?? d.name} fallback={Icon} tone={isTarget ? "positive" : "negative"} className="h-9 w-9" />
                        <div className="absolute -left-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-surface-2 text-[0.62rem] font-bold text-text outline outline-4 outline-surface">
                          {index + 1}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="truncate font-semibold text-text">{d.name}{d.lender ? <span className="ml-1 font-normal text-text-3">· {d.lender}</span> : null}</p>
                          {isTarget && (
                            <span className="shrink-0 rounded-full bg-brand-soft px-1.5 py-0.5 text-[0.6rem] font-bold tracking-wide text-brand-on-soft">
                              1ST TARGET
                            </span>
                          )}
                        </div>
                        <p className="truncate text-[0.76rem] text-text-3">
                          {formatINR(d.outstanding)} · {d.rate ? `${d.rate}%` : "0%"} · clear by {formatDate(d.clearedOn.toISOString(), true)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[0.84rem] font-semibold text-text">{humanMonths(d.months)}</p>
                        <p className="text-[0.72rem] text-text-3">↘ {formatINR(d.interest)}</p>
                      </div>
                    </div>
                    {/* Payment breakdown */}
                    <div className="rounded-[10px] bg-surface-2 px-3.5 py-2.5">
                      <div className="flex items-center justify-between text-[0.76rem]">
                        <span className="text-text-3">Fixed EMI</span>
                        <span className="font-semibold text-text tnum">{formatINR(d.emi)}/mo</span>
                      </div>
                      {(d.initialPayment - d.emi) > 0 && (
                        <div className="mt-1 flex items-center justify-between text-[0.76rem]">
                          <span className="text-brand">+ Extra payment{isTarget && extra > 0 ? ' (targeted)' : ''}</span>
                          <span className="font-semibold text-brand tnum">+{formatINR(d.initialPayment - d.emi)}/mo</span>
                        </div>
                      )}
                      <div className="mt-1.5 flex items-center justify-between border-t border-border/60 pt-1.5 text-[0.78rem]">
                        <span className="font-medium text-text-2">Total payment</span>
                        <span className="font-bold text-text tnum">{formatINR(d.initialPayment)}/mo</span>
                      </div>
                    </div>
                    {/* Specific extra input */}
                    <div className="flex items-center gap-2">
                      <span className="text-[0.74rem] text-text-3">Add extra for this loan:</span>
                      <div className="relative w-24">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[0.76rem] text-text-3">₹</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          className="w-full rounded-md border border-border bg-surface py-1 pl-5 pr-2 text-[0.78rem] font-semibold text-text outline-none placeholder:font-medium placeholder:text-text-3 focus:border-brand"
                          placeholder="0"
                          value={specificExtra[d.id] ? sanitizeMoneyInput(specificExtra[d.id].toString()) : ""}
                          onChange={(e) => {
                            const val = parseInt(e.target.value.replace(/[^0-9]/g, "") || "0", 10);
                            setSpecificExtra(prev => ({ ...prev, [d.id]: val }));
                          }}
                        />
                      </div>
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
                  {foreclosedLiabilities.map((d) => {
                    const Icon = LIABILITY_KIND_META[d.kind as LiabilityKind].icon;
                    return (
                      <div key={d.id} className="flex flex-col gap-4 border-b border-border/60 px-5 py-4 last:border-0">
                        <div className="flex items-center gap-3 opacity-60">
                          <div className="relative shrink-0">
                            <div
                              className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-surface-3 text-text-3 grayscale"
                            >
                              <Icon className="h-4.5 w-4.5" />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="truncate font-semibold text-text line-through">{d.lender || d.name}</p>
                            <p className="truncate text-[0.76rem] text-text-3">
                              {formatINR(d.outstanding)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center justify-end">
                          <button
                            onClick={() => openWealth("liability", d.id)}
                            className="text-[0.76rem] font-semibold text-text-2 hover:text-text underline decoration-border underline-offset-4"
                          >
                            Edit
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
