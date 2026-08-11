"use client";

import { useState } from "react";
import { Plus, Check, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BankBadge } from "./bank-badge";
import { ACCOUNT_KIND_META, LIABILITY_KIND_META } from "@/lib/categories";
import { useStore, useMyId } from "@/store/useStore";
import { withLiveBalances } from "@/lib/accounts";
import { liveLiabilityOutstanding } from "@/lib/liabilities";
import { formatINR, cn, uid as newId } from "@/lib/utils";
import type { AccountKind, ID, Account } from "@/lib/types";

export function AccountPicker({
  value,
  onChange,
  label,
  includeCards,
  cardsOnly,
}: {
  value: ID | null;
  onChange: (id: ID | null) => void;
  label: string;
  includeCards?: boolean;
  cardsOnly?: boolean;
}) {
  const accounts = useStore((s) => s.accounts);
  const liabilities = useStore((s) => s.liabilities);
  const finance = useStore((s) => s.finance);
  const expenses = useStore((s) => s.expenses);
  const setWealth = useStore((s) => s.setWealth);
  const myId = useMyId() ?? "";
  // Investments live in their own section — you don't pay from an SIP.
  const live: (Omit<Account, "balance" | "createdAt"> & { balance: number; limit?: number })[] = cardsOnly
    ? []
    : withLiveBalances(accounts, finance, expenses, myId).filter((a) => a.kind !== "investment");

  if (includeCards || cardsOnly) {
    const cards = liabilities
      .filter((l) => l.kind === "card")
      .map((l) => {
        const out = liveLiabilityOutstanding(l, finance, expenses, myId);
        const limit = l.limit ?? 0;
        return { id: l.id, name: l.name, kind: "card" as AccountKind, balance: limit - out, limit };
      });
    live.push(...cards);
  }

  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");

  function createAccount() {
    const name = newName.trim();
    if (!name) return;
    const acc = { id: newId("acc_"), name, kind: "bank" as AccountKind, balance: 0 };
    setWealth({ accounts: [acc, ...accounts] });
    onChange(acc.id);
    setAdding(false);
    setNewName("");
  }

  return (
    <div>
      <p className="mb-2 px-0.5 text-[0.8rem] font-semibold text-text-2">{label}</p>
      <div className="flex flex-col gap-1.5">
        {live.map((a) => {
          const on = value === a.id;
          const Icon = (a.kind as unknown as string) === "card" ? LIABILITY_KIND_META["card"].icon : ACCOUNT_KIND_META[a.kind as AccountKind].icon;
          return (
            <button
              key={a.id}
              onClick={() => onChange(a.id)}
              className={cn(
                "flex items-center gap-3 rounded-[13px] border px-3 py-2.5 text-left transition-all",
                on ? "border-brand/50 bg-brand-soft" : "border-border bg-surface",
              )}
            >
              <BankBadge name={a.name} fallback={Icon} tone="positive" className="h-8 w-8" />
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-[0.9rem] font-medium text-text">{a.name}</span>
                {a.limit ? (
                  <span className="truncate text-[0.68rem] text-text-4">Limit: {formatINR(a.limit)}</span>
                ) : null}
              </div>
              <span className="tnum text-[0.78rem] text-text-3">Avail: {formatINR(a.balance)}</span>
              {on && <Check className="h-4 w-4 shrink-0 text-brand" />}
            </button>
          );
        })}

        {cardsOnly ? null : (
          <button
            onClick={() => onChange(null)}
            className={cn(
              "flex items-center gap-3 rounded-[13px] border px-3 py-2.5 text-left transition-all",
              value === null ? "border-brand/50 bg-brand-soft" : "border-border bg-surface",
            )}
          >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-inset text-text-3">
            <Ban className="h-4 w-4" />
          </span>
            <span className="flex-1 text-[0.9rem] font-medium text-text-2">Cash / not tracked</span>
            {value === null && <Check className="h-4 w-4 shrink-0 text-brand" />}
          </button>
        )}

        {!cardsOnly && adding ? (
          <div className="flex gap-2">
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createAccount()}
              placeholder="Account name"
              className="h-10 flex-1 rounded-[12px] border border-border bg-surface px-3 text-[0.9rem] outline-none transition-colors focus:border-border-strong"
            />
            <Button variant="secondary" onClick={() => setAdding(false)} className="px-3">
              Cancel
            </Button>
            <Button size="md" onClick={createAccount} disabled={!newName.trim()}>
              Add
            </Button>
          </div>
        ) : !cardsOnly ? (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-3 rounded-[13px] border border-dashed border-border bg-transparent px-3 py-2.5 text-left text-brand transition-colors hover:border-brand/30 hover:bg-brand-soft"
          >
            <Plus className="h-4 w-4" /> New account
          </button>
        ) : null}
      </div>
    </div>
  );
}
