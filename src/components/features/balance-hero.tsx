"use client";

import { motion } from "framer-motion";
import { ArrowDownLeft, ArrowUpRight, Check } from "lucide-react";
import { useStore, useMyId } from "@/store/useStore";
import { overallSummary } from "@/lib/balances";
import { AnimatedAmount } from "@/components/ui/animated-number";
import { formatINR } from "@/lib/utils";

export function BalanceHero() {
  const expenses = useStore((s) => s.expenses);
  const myId = useMyId();
  const { net, owedToYou, youOwe } = overallSummary(expenses, myId ?? "");
  const settled = Math.abs(net) < 0.5;
  const positive = net >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 240, damping: 26 }}
      className="relative overflow-hidden rounded-[24px] p-5 text-white shadow-[var(--shadow-lg)]"
      style={{ background: "linear-gradient(152deg, #22795d 0%, #185a44 46%, #0f3f2e 100%)" }}
    >
      {/* Ledger texture + glow */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.14]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(90deg, rgba(255,255,255,0.6) 0 1px, transparent 1px 27px)",
          maskImage: "linear-gradient(to bottom, transparent, #000 30%, #000 70%, transparent)",
        }}
      />
      <div className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-white/10 blur-2xl" />

      <div className="relative">
        <p className="text-[0.72rem] font-semibold uppercase tracking-[0.1em] text-white/60">
          {settled ? "You're all settled" : positive ? "You are owed overall" : "You owe overall"}
        </p>

        <div className="mt-1 flex items-baseline gap-2">
          <AnimatedAmount
            value={settled ? 0 : Math.abs(net)}
            className="font-display text-[2.75rem] font-bold leading-none tracking-[-0.03em] tnum"
          />
          {settled && <Check className="h-7 w-7 text-white/80" strokeWidth={2.5} />}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2.5">
          <div className="rounded-[14px] bg-white/10 p-3 ring-1 ring-white/10 backdrop-blur-sm">
            <div className="flex items-center gap-1.5 text-white/70">
              <ArrowUpRight className="h-3.5 w-3.5" />
              <span className="text-[0.72rem] font-medium">Owed to you</span>
            </div>
            <p className="mt-1 font-display text-xl font-bold tracking-tight tnum" style={{ color: "#a6f2cf" }}>
              {formatINR(owedToYou)}
            </p>
          </div>
          <div className="rounded-[14px] bg-white/10 p-3 ring-1 ring-white/10 backdrop-blur-sm">
            <div className="flex items-center gap-1.5 text-white/70">
              <ArrowDownLeft className="h-3.5 w-3.5" />
              <span className="text-[0.72rem] font-medium">You owe</span>
            </div>
            <p className="mt-1 font-display text-xl font-bold tracking-tight tnum" style={{ color: "#ffb7a6" }}>
              {formatINR(youOwe)}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
