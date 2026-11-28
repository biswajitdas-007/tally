"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { useStore, useMyId } from "@/store/useStore";
import { scopedDebts, scopedTotals } from "@/lib/balances";
import { AnimatedAmount } from "@/components/ui/animated-number";
import { TallyMark } from "@/components/app/logo";
import { formatINR, cn } from "@/lib/utils";

function headline(settled: boolean, net: number): string {
  if (settled) return "You're all settled";
  return net > 0 ? "You are owed overall" : "You owe overall";
}

function Figure({ label, value, tone }: Readonly<{ label: string; value: number; tone: "positive" | "negative" }>) {
  return (
    <div className="rounded-[18px] bg-hero-2 px-3.5 py-3">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-hero-muted">
        <span
          aria-hidden
          className={cn("h-2 w-2 rounded-full", tone === "positive" ? "bg-hero-positive" : "bg-hero-negative")}
        />
        {label}
      </p>
      <p
        className={cn(
          "mt-1 text-lg font-semibold tracking-[-0.02em] tnum",
          tone === "positive" ? "text-hero-positive" : "text-hero-negative",
        )}
      >
        {formatINR(value, { decimals: false })}
      </p>
    </div>
  );
}

/** The Home balance card: net position across everyone, then the two sides of it. */
export function BalanceHero() {
  const expenses = useStore((s) => s.expenses);
  const myId = useMyId();
  const { net, owedToYou, youOwe } = useMemo(
    () => scopedTotals(scopedDebts(expenses, myId ?? "")),
    [expenses, myId],
  );
  const settled = Math.abs(net) < 0.5;

  return (
    <motion.section
      aria-label="Your balance"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 240, damping: 26 }}
      className="relative overflow-hidden rounded-[28px] border border-hero-border bg-hero p-[22px] text-white shadow-[var(--shadow-lg)]"
    >
      <TallyMark
        size={150}
        title={null}
        className="pointer-events-none absolute -top-[18px] -right-[22px] opacity-[0.22]"
      />

      <div className="relative">
        <p className="text-sm font-semibold text-hero-muted">{headline(settled, net)}</p>
        <div className="mt-1 flex items-baseline gap-2">
          <AnimatedAmount
            value={settled ? 0 : Math.abs(net)}
            className="text-[2.75rem] leading-none font-semibold tracking-[-0.04em] tnum"
          />
          {settled && <Check className="h-7 w-7 text-hero-positive" strokeWidth={2} aria-hidden />}
        </div>

        <div className="mt-[18px] grid grid-cols-2 gap-2.5">
          <Figure label="Owed to you" value={owedToYou} tone="positive" />
          <Figure label="You owe" value={youOwe} tone="negative" />
        </div>
      </div>
    </motion.section>
  );
}
