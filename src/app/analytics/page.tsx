"use client";

import { useMemo } from "react";
import { TrendingDown, TrendingUp, Download, ChartPie } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Donut } from "@/components/charts/donut";
import { BarChart } from "@/components/charts/bar-chart";
import { useStore } from "@/store/useStore";
import { ME_ID } from "@/lib/seed";
import { CATEGORIES } from "@/lib/categories";
import { categoryBreakdown, monthlySpend, monthlyTrend, myShare } from "@/lib/balances";
import { formatINR, monthLabel, cn } from "@/lib/utils";

export default function AnalyticsPage() {
  const expenses = useStore((s) => s.expenses);
  const groups = useStore((s) => s.groups);

  const now = new Date();
  const thisKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevKey = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`;

  const thisSpend = monthlySpend(expenses, ME_ID, thisKey);
  const lastSpend = monthlySpend(expenses, ME_ID, prevKey);
  const delta = lastSpend > 0 ? ((thisSpend - lastSpend) / lastSpend) * 100 : 0;
  const up = thisSpend > lastSpend;

  const trend = monthlyTrend(expenses, ME_ID, 6).map((t) => ({ label: monthLabel(t.key), value: t.amount }));
  const breakdown = categoryBreakdown(expenses, ME_ID, thisKey);
  const totalBreakdown = breakdown.reduce((a, b) => a + b.amount, 0) || 1;
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
      map.set(key, (map.get(key) ?? 0) + myShare(e, ME_ID));
    }
    return [...map.entries()]
      .map(([k, v]) => ({
        name: k === "personal" ? "Personal / 1-on-1" : groups.find((g) => g.id === k)?.name ?? "—",
        icon: k === "personal" ? "👤" : groups.find((g) => g.id === k)?.icon ?? "•",
        amount: v,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [expenses, groups]);
  const byGroupTotal = byGroup.reduce((a, g) => a + g.amount, 0) || 1;

  function exportCsv() {
    const rows = [["Date", "Description", "Category", "Total", "Your share", "Group"]];
    for (const e of [...expenses].sort((a, b) => +new Date(b.date) - +new Date(a.date))) {
      rows.push([
        new Date(e.date).toISOString().slice(0, 10),
        `"${e.description.replace(/"/g, "'")}"`,
        e.category,
        String(e.amount),
        String(myShare(e, ME_ID)),
        groups.find((g) => g.id === e.groupId)?.name ?? "",
      ]);
    }
    const blob = new Blob([rows.map((r) => r.join(",")).join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tally-expenses-${thisKey}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Insights"
        subtitle="Your spending, split-adjusted"
        action={
          <button
            onClick={exportCsv}
            className="flex h-9 items-center gap-1.5 rounded-full border border-border bg-surface px-3.5 text-[0.8rem] font-semibold text-text-2 transition-colors hover:border-border-strong"
          >
            <Download className="h-4 w-4" /> Export
          </button>
        }
      />

      {/* This month */}
      <Card className="p-5">
        <p className="text-[0.72rem] font-semibold uppercase tracking-wide text-text-3">You spent this month</p>
        <div className="mt-1 flex items-end gap-3">
          <p className="font-display text-[2.4rem] font-bold leading-none tracking-[-0.03em] tnum">
            {formatINR(thisSpend)}
          </p>
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
        <p className="mt-1 text-[0.82rem] text-text-2">
          {lastSpend > 0
            ? `${up ? "Up" : "Down"} from ${formatINR(lastSpend)} last month`
            : "Your share across all expenses"}
        </p>

        <div className="mt-5 border-t border-border pt-4">
          <BarChart data={trend} height={130} />
        </div>
      </Card>

      {/* Category breakdown */}
      <Card className="p-5">
        <p className="mb-1 text-[0.72rem] font-semibold uppercase tracking-wide text-text-3">Where it went</p>
        {breakdown.length > 0 ? (
          <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:gap-6">
            <Donut data={donutData} size={168} stroke={22}>
              <span className="text-[0.68rem] font-medium text-text-3">This month</span>
              <span className="font-display text-xl font-bold tnum">{formatINR(thisSpend, { compact: true })}</span>
            </Donut>
            <div className="flex w-full flex-1 flex-col gap-2.5">
              {breakdown.slice(0, 6).map((b) => {
                const meta = CATEGORIES[b.category];
                const pct = Math.round((b.amount / totalBreakdown) * 100);
                return (
                  <div key={b.category} className="flex items-center gap-3">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: meta.color }} />
                    <span className="flex-1 truncate text-[0.85rem] font-medium text-text">{meta.label}</span>
                    <span className="text-[0.78rem] text-text-3">{pct}%</span>
                    <span className="w-16 text-right text-[0.85rem] font-semibold text-text tnum">
                      {formatINR(b.amount, { compact: true })}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <EmptyState icon={ChartPie} title="No spending yet" description="Add expenses to see your category breakdown." />
        )}
      </Card>

      {/* By group */}
      <Card className="p-5">
        <p className="mb-3 text-[0.72rem] font-semibold uppercase tracking-wide text-text-3">Spending by group</p>
        <div className="flex flex-col gap-3.5">
          {byGroup.map((g) => (
            <div key={g.name}>
              <div className="mb-1.5 flex items-center gap-2">
                <span>{g.icon}</span>
                <span className="flex-1 text-[0.85rem] font-medium text-text">{g.name}</span>
                <span className="text-[0.85rem] font-semibold text-text tnum">{formatINR(g.amount)}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-surface-inset">
                <div
                  className="h-full rounded-full bg-brand transition-all"
                  style={{ width: `${(g.amount / byGroupTotal) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
