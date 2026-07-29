"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { TrendingDown, TrendingUp, FileText, ChartPie, AlertTriangle, Sparkles, Lightbulb, type LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { PageGrid, PageCol } from "@/components/app/page-grid";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Donut } from "@/components/charts/donut";
import { BarChart } from "@/components/charts/bar-chart";
import { useStore, useMyId } from "@/store/useStore";
import { CATEGORIES } from "@/lib/categories";
import { myShare } from "@/lib/balances";
import { monthlyMoney, spendByCategory, monthFromParam, monthLabel as monthName } from "@/lib/money";
import { insights, type Insight } from "@/lib/insights";
import { formatINR, percentShares, monthLabel, cn } from "@/lib/utils";
import { MonthNav } from "@/components/app/month-nav";

const INSIGHT_ICON: Record<Insight["tone"], LucideIcon> = { warn: AlertTriangle, good: Sparkles, info: Lightbulb };

function InsightCard({ ins }: { ins: Insight }) {
  const Icon = INSIGHT_ICON[ins.tone];
  const styles =
    ins.tone === "warn"
      ? "bg-negative-soft text-negative"
      : ins.tone === "good"
        ? "bg-positive-soft text-positive"
        : "bg-brand-soft text-brand";
  return (
    <div className="flex gap-3 rounded-[15px] border border-border bg-surface p-3.5 shadow-[var(--shadow-xs)]">
      <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full", styles)}>
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <div className="min-w-0">
        <p className="text-[0.88rem] font-semibold leading-snug text-text">{ins.title}</p>
        <p className="mt-0.5 text-[0.8rem] leading-snug text-text-2">{ins.detail}</p>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  // useSearchParams needs a boundary so the rest of the page can prerender.
  return (
    <Suspense>
      <Analytics />
    </Suspense>
  );
}

function Analytics() {
  const expenses = useStore((s) => s.expenses);
  const finance = useStore((s) => s.finance);
  const budget = useStore((s) => s.budget);
  const groups = useStore((s) => s.groups);
  const myId = useMyId() ?? "";

  const requested = useSearchParams().get("m");
  const [mDate, setMDate] = useState(() => monthFromParam(requested));
  const key = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  const thisKey = key(mDate);
  const prevKey = key(new Date(mDate.getFullYear(), mDate.getMonth() - 1, 1));
  const isCurrent = thisKey === key(new Date());

  const tips = useMemo(() => insights(finance, expenses, budget, myId), [finance, expenses, budget, myId]);

  const thisSpend = useMemo(() => monthlyMoney(finance, expenses, myId, thisKey).spend, [finance, expenses, myId, thisKey]);
  const lastSpend = useMemo(() => monthlyMoney(finance, expenses, myId, prevKey).spend, [finance, expenses, myId, prevKey]);
  const delta = lastSpend > 0 ? ((thisSpend - lastSpend) / lastSpend) * 100 : 0;
  const up = thisSpend > lastSpend;
  const spendCaption =
    lastSpend > 0
      ? `${up ? "Up" : "Down"} from ${formatINR(lastSpend)} in ${monthName(prevKey)}`
      : "Personal spending + your share of splits";

  const trend = useMemo(() => {
    const out: { label: string; value: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const k = key(new Date(mDate.getFullYear(), mDate.getMonth() - i, 1));
      out.push({ label: monthLabel(k), value: monthlyMoney(finance, expenses, myId, k).spend });
    }
    return out;
  }, [finance, expenses, myId, mDate]);

  const breakdown = useMemo(() => spendByCategory(finance, expenses, myId, thisKey), [finance, expenses, myId, thisKey]);
  const breakdownShares = useMemo(() => percentShares(breakdown.map((b) => b.amount)), [breakdown]);
  const donutData = breakdown.map((b) => ({
    label: CATEGORIES[b.category].label,
    value: b.amount,
    color: CATEGORIES[b.category].color,
  }));

  const byGroup = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of expenses) {
      if (e.isSettlement) continue;
      const key = e.groupId ?? "personal";
      map.set(key, (map.get(key) ?? 0) + myShare(e, myId));
    }
    return [...map.entries()]
      .map(([k, v]) => ({
        name: k === "personal" ? "Personal / 1-on-1" : groups.find((g) => g.id === k)?.name ?? "—",
        icon: k === "personal" ? "👤" : groups.find((g) => g.id === k)?.icon ?? "•",
        amount: v,
      }))
      .filter((g) => g.amount > 0.5)
      .sort((a, b) => b.amount - a.amount);
  }, [expenses, groups, myId]);
  const byGroupTotal = byGroup.reduce((a, g) => a + g.amount, 0) || 1;


  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Insights"
        subtitle="Your full spending picture"
        action={
          <Link
            href={`/report?m=${thisKey}`}
            className="flex h-9 items-center gap-1.5 rounded-full border border-border bg-surface px-3.5 text-[0.8rem] font-semibold text-text-2 transition-colors hover:border-border-strong"
          >
            <FileText className="h-4 w-4" /> Report
          </Link>
        }
      />

      {/* Its own row — beside the title it would push a narrow phone sideways. */}
      <MonthNav value={mDate} onChange={setMDate} className="-mt-4 -ml-2" />

      <PageGrid>
        <PageCol>
          {/* Smart insights */}
          {isCurrent && tips.length > 0 && (
            <section className="flex flex-col gap-2.5">
              {tips.map((t) => (
                <InsightCard key={t.key} ins={t} />
              ))}
            </section>
          )}

          {/* This month */}
          <Card className="p-5">
            <p className="text-[0.72rem] font-semibold uppercase tracking-wide text-text-3">
              {isCurrent ? "You spent this month" : `You spent in ${monthName(thisKey)}`}
            </p>
            <div className="mt-1 flex items-end gap-3">
              <p className="font-display text-[2.4rem] font-bold leading-none tracking-[-0.03em] tnum">{formatINR(thisSpend)}</p>
              {lastSpend > 0 && (
                <span
                  className={cn(
                    "mb-1.5 flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.72rem] font-semibold",
                    up ? "bg-negative-soft text-negative" : "bg-positive-soft text-positive",
                  )}
                >
                  {up ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                  {Math.abs(delta).toFixed(0)}%
                </span>
              )}
            </div>
            <p className="mt-1 text-[0.82rem] text-text-2">{spendCaption}</p>

            <div className="mt-5 border-t border-border pt-4">
              <BarChart data={trend} height={130} />
            </div>
          </Card>

        </PageCol>

        <PageCol>
          {/* Category breakdown */}
          <Card className="p-5">
            <p className="mb-1 text-[0.72rem] font-semibold uppercase tracking-wide text-text-3">Where it went</p>
            {breakdown.length > 0 ? (
              // Side by side once there's room — but the xl side column is narrow again, so it stacks back there.
              <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:gap-6 xl:flex-col xl:gap-5">
                <Donut data={donutData} size={168} stroke={22}>
                  <span className="text-[0.68rem] font-medium text-text-3">{isCurrent ? "This month" : monthName(thisKey)}</span>
                  <span className="font-display text-xl font-bold tnum">{formatINR(thisSpend, { compact: true })}</span>
                </Donut>
                <div className="flex w-full flex-1 flex-col gap-2.5">
                  {breakdown.slice(0, 6).map((b, i) => {
                    const meta = CATEGORIES[b.category];
                    return (
                      <div key={b.category} className="flex items-center gap-3">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: meta.color }} />
                        <span className="flex-1 truncate text-[0.85rem] font-medium text-text">{meta.label}</span>
                        <span className="text-[0.78rem] text-text-3">{breakdownShares[i]}%</span>
                        <span className="w-16 text-right text-[0.85rem] font-semibold text-text tnum">
                          {formatINR(b.amount, { compact: true })}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <EmptyState
                icon={ChartPie}
                title={isCurrent ? "No spending yet" : `Nothing in ${monthName(thisKey)}`}
                description={isCurrent ? "Add expenses to see your category breakdown." : "Pick another month to see where the money went."}
              />
            )}
          </Card>

          {/* By group */}
          {byGroup.length > 0 && (
            <Card className="p-5">
              <p className="mb-3 text-[0.72rem] font-semibold uppercase tracking-wide text-text-3">Split spending by group (all time)</p>
              <div className="flex flex-col gap-3.5">
                {byGroup.map((g) => (
                  <div key={g.name}>
                    <div className="mb-1.5 flex items-center gap-2">
                      <span>{g.icon}</span>
                      <span className="flex-1 text-[0.85rem] font-medium text-text">{g.name}</span>
                      <span className="text-[0.85rem] font-semibold text-text tnum">{formatINR(g.amount)}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-surface-inset">
                      <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${(g.amount / byGroupTotal) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </PageCol>
      </PageGrid>
    </div>
  );
}
