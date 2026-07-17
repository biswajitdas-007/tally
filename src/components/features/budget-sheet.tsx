"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { CATEGORY_LIST } from "@/lib/categories";
import { useStore } from "@/store/useStore";
import { useUI } from "@/store/useUI";
import { useToast } from "@/components/ui/toast";
import { cn, formatINR } from "@/lib/utils";
import type { CategoryKey } from "@/lib/types";

export function BudgetSheet() {
  const open = useUI((s) => s.budgetOpen);
  const close = useUI((s) => s.closeBudget);
  const budget = useStore((s) => s.budget);
  const setBudget = useStore((s) => s.setBudget);
  const { toast } = useToast();

  const [income, setIncome] = useState("");
  const [limits, setLimits] = useState<Record<string, string>>({});

  const [wasOpen, setWasOpen] = useState(false);
  if (open && !wasOpen) {
    setWasOpen(true);
    setIncome(budget.income ? String(budget.income) : "");
    setLimits(Object.fromEntries(Object.entries(budget.limits).map(([k, v]) => [k, String(v)])));
  } else if (!open && wasOpen) {
    setWasOpen(false);
  }

  const inc = parseFloat(income) || 0;
  const buckets: [string, string, number][] = [
    ["Needs", "50%", inc * 0.5],
    ["Wants", "30%", inc * 0.3],
    ["Savings", "20%", inc * 0.2],
  ];

  function save() {
    const cleanLimits: Partial<Record<CategoryKey, number>> = {};
    for (const [k, v] of Object.entries(limits)) {
      const n = parseFloat(v);
      if (n > 0) cleanLimits[k as CategoryKey] = n;
    }
    setBudget({ income: inc > 0 ? inc : undefined, limits: cleanLimits });
    toast({ message: "Budget saved" });
    close();
  }

  return (
    <Sheet open={open} onClose={close} title="Set your budget">
      <div className="flex flex-col gap-5 pt-1">
        {/* Income → 50/30/20 */}
        <div>
          <p className="mb-2 px-0.5 text-[0.8rem] font-semibold text-text-2">Monthly income (take-home)</p>
          <div className="flex items-center gap-2 rounded-[14px] border border-border bg-surface px-4 py-3">
            <span className="font-display text-lg font-semibold text-text-2">₹</span>
            <input
              value={income}
              onChange={(e) => setIncome(e.target.value.replace(/[^0-9.]/g, ""))}
              inputMode="decimal"
              placeholder="50000"
              className="flex-1 bg-transparent font-display text-lg font-bold tnum outline-none placeholder:text-text-3"
            />
          </div>
          {inc > 0 && (
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              {buckets.map(([label, pct, val]) => (
                <div key={label} className="rounded-[12px] bg-surface-inset px-2 py-2.5">
                  <p className="text-[0.64rem] font-semibold uppercase tracking-wide text-text-3">
                    {label} · {pct}
                  </p>
                  <p className="mt-0.5 tnum text-[0.9rem] font-bold text-text">{formatINR(val)}</p>
                </div>
              ))}
            </div>
          )}
          <p className="mt-2 px-0.5 text-[0.74rem] text-text-3">
            The 50/30/20 rule: half for needs, a third for wants, the rest saved.
          </p>
        </div>

        {/* Category caps */}
        <div>
          <p className="mb-2 px-0.5 text-[0.8rem] font-semibold text-text-2">Category limits (optional)</p>
          <div className="overflow-hidden rounded-[16px] border border-border">
            {CATEGORY_LIST.map((c, i) => {
              const Icon = c.icon;
              return (
                <div key={c.key} className={cn("flex items-center gap-3 px-3.5 py-2.5", i > 0 && "border-t border-border")}>
                  <span
                    className="flex h-8 w-8 items-center justify-center rounded-full"
                    style={{ background: `color-mix(in srgb, ${c.color} 16%, transparent)`, color: c.color }}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="flex-1 text-[0.9rem] font-medium text-text">{c.label}</span>
                  <div className="flex items-center gap-1">
                    <span className="text-text-3">₹</span>
                    <input
                      value={limits[c.key] ?? ""}
                      onChange={(e) => setLimits((p) => ({ ...p, [c.key]: e.target.value.replace(/[^0-9.]/g, "") }))}
                      inputMode="decimal"
                      placeholder="—"
                      className="w-20 rounded-lg bg-surface-inset px-2 py-1 text-right text-[0.9rem] tnum outline-none transition-colors focus:bg-surface"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="sticky bottom-0 -mx-5 border-t border-border bg-surface px-5 pb-1 pt-3">
          <Button variant="primary" size="lg" fullWidth onClick={save}>
            <Check className="h-4.5 w-4.5" /> Save budget
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
