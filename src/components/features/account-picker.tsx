"use client";

import { useState } from "react";
import { Plus, Check, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BankBadge } from "./bank-badge";
import { ACCOUNT_KIND_META } from "@/lib/categories";
import { useStore, useMyId } from "@/store/useStore";
import { withLiveBalances } from "@/lib/accounts";
import { formatINR, cn, uid as newId } from "@/lib/utils";
import type { AccountKind, ID } from "@/lib/types";

export function AccountPicker({
  value,
  onChange,
  label,
}: {
  value: ID | null;
  onChange: (id: ID | null) => void;
  label: string;
}) {
  const accounts = useStore((s) => s.accounts);
  const finance = useStore((s) => s.finance);
  const expenses = useStore((s) => s.expenses);
  const setWealth = useStore((s) => s.setWealth);
  const myId = useMyId() ?? "";
  const live = withLiveBalances(accounts, finance, expenses, myId);

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
          const Icon = ACCOUNT_KIND_META[a.kind].icon;
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
              <span className="min-w-0 flex-1 truncate text-[0.9rem] font-medium text-text">{a.name}</span>
              <span className="tnum text-[0.78rem] text-text-3">{formatINR(a.balance)}</span>
              {on && <Check className="h-4 w-4 shrink-0 text-brand" />}
            </button>
          );
        })}

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

        {adding ? (
          <div className="flex gap-2">
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createAccount()}
              placeholder="Account name"
              className="h-10 flex-1 rounded-[12px] border border-border bg-surface px-3 text-[0.9rem] outline-none focus:ring-2 focus:ring-brand"
            />
            <Button size="md" onClick={createAccount} disabled={!newName.trim()}>
              Add
            </Button>
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-2 rounded-[13px] border border-dashed border-border-strong px-3 py-2.5 text-[0.85rem] font-semibold text-text-2 transition-colors hover:bg-surface-inset"
          >
            <Plus className="h-4 w-4" /> New account
          </button>
        )}
      </div>
    </div>
  );
}
