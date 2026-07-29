"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Search, Plus, Minus, Users, UserPlus, Target, Repeat, Wallet, Landmark, ShieldCheck,
  FileSpreadsheet, ScanLine, Home, Receipt, PieChart, Activity, User, Flag, CornerDownLeft, type LucideIcon,
} from "lucide-react";
import { useUI } from "@/store/useUI";
import { useScrollLock } from "@/hooks/use-scroll-lock";
import { usePresence } from "@/hooks/use-presence";
import { cn } from "@/lib/utils";

interface Cmd {
  id: string;
  label: string;
  hint: string;
  icon: LucideIcon;
  group: "Add" | "Go to" | "Manage";
  run: () => void;
}

/**
 * Cmd/Ctrl-K palette. Everything the app can do from one keystroke, which
 * matters most on desktop where there's no thumb-reachable + button.
 */
export function CommandPalette() {
  const router = useRouter();
  const ui = useUI();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);
  const [present, onExitComplete] = usePresence(open);
  useScrollLock(present);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
        setQ("");
        setActive(0);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const commands = useMemo<Cmd[]>(() => {
    const go = (href: string) => () => router.push(href);
    return [
      { id: "expense", label: "Add a split expense", hint: "Split with friends", icon: Plus, group: "Add", run: () => ui.openAdd() },
      { id: "spend", label: "Add an expense", hint: "Your own spending", icon: Minus, group: "Add", run: () => ui.openMoney("expense") },
      { id: "income", label: "Add income", hint: "Salary, refunds, anything in", icon: Wallet, group: "Add", run: () => ui.openMoney("income") },
      { id: "group", label: "New group", hint: "Flat, trip, anything shared", icon: Users, group: "Add", run: ui.openCreateGroup },
      { id: "invite", label: "Invite someone", hint: "Add a friend by email", icon: UserPlus, group: "Add", run: () => ui.openInvite(null) },
      { id: "repeat", label: "New repeat", hint: "Rent, salary, subscriptions", icon: Repeat, group: "Add", run: () => ui.openRecur() },
      { id: "account", label: "Add an account", hint: "Bank, cash or wallet", icon: Landmark, group: "Add", run: () => ui.openWealth("asset") },
      { id: "loan", label: "Add a loan", hint: "Something you owe", icon: Receipt, group: "Add", run: () => ui.openWealth("liability") },
      { id: "invest", label: "Add an investment", hint: "SIP, stocks, FD", icon: PieChart, group: "Add", run: () => ui.openInvest() },

      { id: "budget", label: "Set your budget", hint: "A monthly limit", icon: Target, group: "Manage", run: ui.openBudget },
      { id: "ef", label: "Emergency fund", hint: "Set or edit your target", icon: ShieldCheck, group: "Manage", run: ui.openEmergency },
      { id: "reconcile", label: "Check balances", hint: "Confirm against your bank", icon: ScanLine, group: "Manage", run: ui.openReconcile },
      { id: "import", label: "Import a statement", hint: "Bring in a bank CSV", icon: FileSpreadsheet, group: "Manage", run: go("/import") },

      { id: "home", label: "Home", hint: "Balances and activity", icon: Home, group: "Go to", run: go("/") },
      { id: "money", label: "Money", hint: "Income and spending", icon: Wallet, group: "Go to", run: go("/money") },
      { id: "wealth", label: "Wealth", hint: "Net worth and health", icon: Landmark, group: "Go to", run: go("/wealth") },
      { id: "debt", label: "Debt-free plan", hint: "Payoff order and dates", icon: Flag, group: "Go to", run: go("/debt") },
      { id: "ledgers", label: "Ledgers", hint: "Groups and direct splits", icon: Users, group: "Go to", run: go("/groups") },
      { id: "insights", label: "Insights", hint: "Where it all went", icon: PieChart, group: "Go to", run: go("/analytics") },
      { id: "activity", label: "Activity", hint: "Everything, newest first", icon: Activity, group: "Go to", run: go("/activity") },
      { id: "friends", label: "Friends", hint: "Who you split with", icon: User, group: "Go to", run: go("/friends") },
      { id: "profile", label: "Account", hint: "Profile and settings", icon: User, group: "Go to", run: go("/account") },
    ];
  }, [router, ui]);

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return commands;
    return commands.filter((c) => `${c.label} ${c.hint} ${c.group}`.toLowerCase().includes(needle));
  }, [commands, q]);

  useEffect(() => setActive(0), [q]);

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-i="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  if (!mounted) return null;

  function choose(c: Cmd | undefined) {
    if (!c) return;
    setOpen(false);
    // Let the overlay unmount before a sheet opens, so focus lands cleanly.
    setTimeout(c.run, 0);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      choose(results[active]);
    }
  }

  let lastGroup = "";

  return createPortal(
    <AnimatePresence onExitComplete={onExitComplete}>
      {open && (
        <div className="fixed inset-0 z-[60] flex justify-center px-4 pt-[max(12vh,calc(var(--overlay-top)+8px))]" role="dialog" aria-modal="true" aria-label="Commands">
          <motion.div
            className="absolute inset-0"
            style={{ background: "var(--scrim)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => setOpen(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -6 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            className="relative flex max-h-[70vh] w-full max-w-[34rem] flex-col overflow-hidden rounded-[20px] border border-border bg-surface shadow-[var(--shadow-lg)]"
          >
            <div className="flex items-center gap-2.5 border-b border-border px-4">
              <Search className="h-4.5 w-4.5 shrink-0 text-text-3" />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="What do you want to do?"
                className="h-13 flex-1 bg-transparent py-4 text-[0.95rem] outline-none placeholder:text-text-3"
              />
              <kbd className="shrink-0 rounded-[6px] border border-border px-1.5 py-0.5 text-[0.68rem] font-medium text-text-3">
                esc
              </kbd>
            </div>

            <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto p-2">
              {results.length === 0 && (
                <p className="px-3 py-8 text-center text-[0.88rem] text-text-3">Nothing matches “{q}”.</p>
              )}
              {results.map((c, i) => {
                const Icon = c.icon;
                const header = c.group !== lastGroup ? c.group : null;
                lastGroup = c.group;
                return (
                  <div key={c.id}>
                    {header && (
                      <p className="px-3 pb-1 pt-3 text-[0.68rem] font-semibold uppercase tracking-wide text-text-3">
                        {header}
                      </p>
                    )}
                    <button
                      data-i={i}
                      onMouseEnter={() => setActive(i)}
                      onClick={() => choose(c)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-[12px] px-3 py-2.5 text-left transition-colors",
                        i === active ? "bg-brand-soft" : "hover:bg-surface-2",
                      )}
                    >
                      <Icon className={cn("h-4.5 w-4.5 shrink-0", i === active ? "text-brand" : "text-text-3")} />
                      <span className="min-w-0 flex-1">
                        <span className={cn("block truncate text-[0.9rem] font-medium", i === active ? "text-brand-on-soft" : "text-text")}>
                          {c.label}
                        </span>
                        <span className="block truncate text-[0.75rem] text-text-3">{c.hint}</span>
                      </span>
                      {i === active && <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-brand" />}
                    </button>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
