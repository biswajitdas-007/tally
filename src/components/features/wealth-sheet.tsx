"use client";

import { useState } from "react";
import { Check, Trash2, type LucideIcon } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { ACCOUNT_KIND_META, ACCOUNT_KINDS, LIABILITY_KIND_META, LIABILITY_KINDS } from "@/lib/categories";
import { useStore } from "@/store/useStore";
import { useUI } from "@/store/useUI";
import { useToast } from "@/components/ui/toast";
import { cn, uid as newId } from "@/lib/utils";
import type { Account, AccountKind, Liability, LiabilityKind } from "@/lib/types";

type Mode = "asset" | "liability";

export function WealthSheet() {
  const open = useUI((s) => s.wealthOpen);
  const initialMode = useUI((s) => s.wealthMode);
  const editId = useUI((s) => s.wealthEditId);
  const close = useUI((s) => s.closeWealth);
  const accounts = useStore((s) => s.accounts);
  const liabilities = useStore((s) => s.liabilities);
  const setWealth = useStore((s) => s.setWealth);
  const { toast } = useToast();

  const editingAccount = editId ? accounts.find((a) => a.id === editId) ?? null : null;
  const editingLiability = editId ? liabilities.find((l) => l.id === editId) ?? null : null;
  const editing = editingAccount || editingLiability;

  const [mode, setMode] = useState<Mode>("asset");
  const [name, setName] = useState("");
  const [kind, setKind] = useState<string>("bank");
  const [amount, setAmount] = useState("");
  const [emi, setEmi] = useState("");
  const [rate, setRate] = useState("");

  const [wasOpen, setWasOpen] = useState(false);
  if (open && !wasOpen) {
    setWasOpen(true);
    setEmi("");
    setRate("");
    if (editingAccount) {
      setMode("asset");
      setName(editingAccount.name);
      setKind(editingAccount.kind);
      setAmount(String(editingAccount.balance));
    } else if (editingLiability) {
      setMode("liability");
      setName(editingLiability.name);
      setKind(editingLiability.kind);
      setAmount(String(editingLiability.outstanding));
      setEmi(editingLiability.emi ? String(editingLiability.emi) : "");
      setRate(editingLiability.rate ? String(editingLiability.rate) : "");
    } else {
      setMode(initialMode);
      setName("");
      setKind(initialMode === "asset" ? "bank" : "loan");
      setAmount("");
    }
  } else if (!open && wasOpen) {
    setWasOpen(false);
  }

  const isAsset = mode === "asset";
  const kinds: string[] = isAsset ? ACCOUNT_KINDS : LIABILITY_KINDS;
  const meta = (isAsset ? ACCOUNT_KIND_META : LIABILITY_KIND_META) as Record<string, { label: string; icon: LucideIcon }>;
  const total = parseFloat(amount) || 0;
  const valid = name.trim().length > 0 && amount !== "" && total >= 0;

  function switchMode(m: Mode) {
    setMode(m);
    setKind(m === "asset" ? "bank" : "loan");
  }

  function save() {
    if (!valid) return;
    const id = editing?.id ?? newId(isAsset ? "acc_" : "liab_");
    if (isAsset) {
      const acc: Account = { id, name: name.trim(), kind: kind as AccountKind, balance: total };
      setWealth({ accounts: editingAccount ? accounts.map((a) => (a.id === id ? acc : a)) : [acc, ...accounts] });
    } else {
      const liab: Liability = { id, name: name.trim(), kind: kind as LiabilityKind, outstanding: total };
      const emiN = parseFloat(emi);
      if (emiN > 0) liab.emi = emiN;
      const rateN = parseFloat(rate);
      if (rate !== "" && rateN >= 0) liab.rate = rateN;
      setWealth({ liabilities: editingLiability ? liabilities.map((l) => (l.id === id ? liab : l)) : [liab, ...liabilities] });
    }
    toast({ message: editing ? "Saved" : isAsset ? "Account added" : "Liability added" });
    close();
  }

  function remove() {
    if (!editing) return;
    if (editingAccount) setWealth({ accounts: accounts.filter((a) => a.id !== editing.id) });
    else setWealth({ liabilities: liabilities.filter((l) => l.id !== editing.id) });
    toast({ message: "Removed", tone: "info" });
    close();
  }

  return (
    <Sheet open={open} onClose={close} title={editing ? "Edit" : isAsset ? "Add account" : "Add liability"}>
      <div className="flex flex-col gap-5 pt-1">
        {!editing && (
          <Segmented<Mode>
            value={mode}
            onChange={switchMode}
            className="w-full"
            options={[
              { value: "asset", label: "I own" },
              { value: "liability", label: "I owe" },
            ]}
          />
        )}

        <div>
          <p className="mb-2 px-0.5 text-[0.8rem] font-semibold text-text-2">Name</p>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={isAsset ? "HDFC Savings" : "Car loan"}
            className="h-12 text-[1rem]"
          />
        </div>

        <div>
          <p className="mb-2 px-0.5 text-[0.8rem] font-semibold text-text-2">Type</p>
          <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
            {kinds.map((k) => {
              const Icon = meta[k].icon;
              const active = kind === k;
              return (
                <button
                  key={k}
                  onClick={() => setKind(k)}
                  className={cn(
                    "flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-[0.82rem] font-medium transition-all",
                    active
                      ? "border-transparent bg-brand-soft text-brand-on-soft"
                      : "border-border bg-surface text-text-2 hover:border-border-strong",
                  )}
                >
                  <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
                  {meta[k].label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="mb-2 px-0.5 text-[0.8rem] font-semibold text-text-2">{isAsset ? "Current balance" : "Amount owed"}</p>
          <div className="flex items-center gap-2 rounded-[14px] border border-border bg-surface px-4 py-3">
            <span className="font-display text-lg font-semibold text-text-2">₹</span>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
              inputMode="decimal"
              placeholder="0"
              className="flex-1 bg-transparent font-display text-lg font-bold tnum outline-none placeholder:text-text-3"
            />
          </div>
        </div>

        {!isAsset && (
          <div className="flex gap-3">
            <div className="flex-1">
              <p className="mb-2 px-0.5 text-[0.8rem] font-semibold text-text-2">Monthly EMI</p>
              <div className="flex items-center gap-1.5 rounded-[14px] border border-border bg-surface px-3 py-3">
                <span className="text-text-2">₹</span>
                <input
                  value={emi}
                  onChange={(e) => setEmi(e.target.value.replace(/[^0-9.]/g, ""))}
                  inputMode="decimal"
                  placeholder="0"
                  className="w-full bg-transparent font-display text-[0.98rem] font-bold tnum outline-none placeholder:text-text-3"
                />
              </div>
            </div>
            <div className="flex-1">
              <p className="mb-2 px-0.5 text-[0.8rem] font-semibold text-text-2">Interest %</p>
              <div className="flex items-center gap-1.5 rounded-[14px] border border-border bg-surface px-3 py-3">
                <input
                  value={rate}
                  onChange={(e) => setRate(e.target.value.replace(/[^0-9.]/g, ""))}
                  inputMode="decimal"
                  placeholder="0"
                  className="w-full bg-transparent font-display text-[0.98rem] font-bold tnum outline-none placeholder:text-text-3"
                />
                <span className="text-text-2">%</span>
              </div>
            </div>
          </div>
        )}

        <div className="sticky bottom-0 -mx-5 flex gap-3 border-t border-border bg-surface px-5 pb-1 pt-3">
          {editing && (
            <Button variant="dangerSoft" size="lg" onClick={remove} aria-label="Remove">
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          <Button variant="primary" size="lg" fullWidth disabled={!valid} onClick={save}>
            <Check className="h-4.5 w-4.5" /> {editing ? "Save changes" : "Add"}
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
