"use client";

import { useMemo, useState } from "react";
import { Search, Receipt, Clock } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { Card } from "@/components/ui/card";
import { Segmented } from "@/components/ui/segmented";
import { EmptyState } from "@/components/ui/empty-state";
import { ExpenseRow } from "@/components/features/expense-row";
import { useStore } from "@/store/useStore";
import type { Expense } from "@/lib/types";

function monthTitle(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

export default function ActivityPage() {
  const expenses = useStore((s) => s.expenses);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "expenses" | "settled">("all");

  const filtered = useMemo(() => {
    return [...expenses]
      .filter((e) => {
        if (filter === "expenses" && e.isSettlement) return false;
        if (filter === "settled" && !e.isSettlement) return false;
        if (query && !e.description.toLowerCase().includes(query.toLowerCase())) return false;
        return true;
      })
      .sort((a, b) => +new Date(b.date) - +new Date(a.date));
  }, [expenses, filter, query]);

  const groups = useMemo(() => {
    const map = new Map<string, Expense[]>();
    for (const e of filtered) {
      const key = monthTitle(e.date);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    return [...map.entries()];
  }, [filtered]);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Activity" subtitle={`${expenses.length} entries`} />

      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-text-3" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search expenses"
          className="h-12 w-full rounded-[14px] border border-border bg-surface-2 pl-11 pr-4 text-[0.95rem] text-text placeholder:text-text-3 transition-colors focus:border-border-strong focus:bg-surface focus:outline-none"
        />
      </div>

      <Segmented
        value={filter}
        onChange={setFilter}
        className="w-full"
        options={[
          { value: "all", label: "All" },
          { value: "expenses", label: "Expenses" },
          { value: "settled", label: "Settlements" },
        ]}
      />

      {groups.length > 0 ? (
        <div className="flex flex-col gap-5">
          {groups.map(([month, items]) => (
            <div key={month}>
              <div className="mb-2 flex items-center gap-2 px-1">
                <Clock className="h-3.5 w-3.5 text-text-3" />
                <h2 className="text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-text-3">{month}</h2>
              </div>
              <Card className="overflow-hidden">
                <div className="divide-y divide-border">
                  {items.map((e) => (
                    <ExpenseRow key={e.id} expense={e} showGroup />
                  ))}
                </div>
              </Card>
            </div>
          ))}
        </div>
      ) : (
        <Card>
          <EmptyState
            icon={Receipt}
            title={query ? "No matches" : "Nothing here yet"}
            description={query ? "Try a different search." : "Your expenses and settlements will appear here."}
          />
        </Card>
      )}
    </div>
  );
}
