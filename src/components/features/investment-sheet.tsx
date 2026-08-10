"use client";

import { useState } from "react";
import { Check, Trash2, ShieldAlert, TrendingUp, TrendingDown } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStore, useMyId } from "@/store/useStore";
import { useUI } from "@/store/useUI";
import { useToast } from "@/components/ui/toast";
import { INVESTMENT_TYPES, INVESTMENT_TYPE_META } from "@/lib/categories";
import { emergencyStatus } from "@/lib/health";
import { withLiveBalances, unparkedAmount } from "@/lib/accounts";
import { cn, formatINR, uid as newId , sanitizeMoneyInput} from "@/lib/utils";
import type { Account, InvestmentType } from "@/lib/types";

export function InvestmentSheet() {
  const open = useUI((s) => s.investOpen);
  const editId = useUI((s) => s.investEditId);
  const close = useUI((s) => s.closeInvest);
  const openEmergency = useUI((s) => s.openEmergency);
  const accounts = useStore((s) => s.accounts);
  const finance = useStore((s) => s.finance);
  const expenses = useStore((s) => s.expenses);
  const emergency = useStore((s) => s.emergency);
  const setWealth = useStore((s) => s.setWealth);
  const myId = useMyId() ?? "";
  const { toast } = useToast();

  const editing = editId ? accounts.find((a) => a.id === editId) ?? null : null;

  // Nudge to shore up the emergency fund before piling into investments.
  const live = withLiveBalances(accounts, finance, expenses, myId);
  const ef = emergencyStatus(emergency, live, unparkedAmount(finance, expenses, accounts, myId));
  const efNudge = !editing && (!ef.set || !ef.funded);

  const [name, setName] = useState("");
  const [type, setType] = useState<InvestmentType>("sip");
  const [value, setValue] = useState("");
  const [invested, setInvested] = useState("");

  const [wasOpen, setWasOpen] = useState(false);
  if (open && !wasOpen) {
    setWasOpen(true);
    setName(editing?.name ?? "");
    setType(editing?.investmentType ?? "sip");
    setValue(editing ? String(editing.balance) : "");
    setInvested(editing?.invested != null ? String(editing.invested) : "");
  } else if (!open && wasOpen) {
    setWasOpen(false);
  }

  const worth = parseFloat(value) || 0;
  const cost = invested === "" ? null : parseFloat(invested) || 0;
  const valid = name.trim().length > 0 && value !== "" && worth >= 0;
  const gain = cost != null && cost > 0 ? worth - cost : null;

  function save() {
    if (!valid) return;
    const id = editing?.id ?? newId("inv_");
    const acc: Account = { id, name: name.trim(), kind: "investment", balance: worth, investmentType: type };
    if (cost != null && cost > 0) acc.invested = cost;
    setWealth({ accounts: editing ? accounts.map((a) => (a.id === id ? acc : a)) : [acc, ...accounts] });
    toast({ message: editing ? "Investment updated" : "Investment added" });
    close();
  }

  function remove() {
    if (!editing) return;
    setWealth({ accounts: accounts.filter((a) => a.id !== editing.id) });
    toast({ message: "Investment removed", tone: "info" });
    close();
  }

  return (
    <Sheet
      open={open}
      onClose={close}
      title={editing ? "Edit investment" : "Add investment"}
      description="Track your SIPs, stocks, FDs and more — they count toward your net worth."
    >
      <div className="flex flex-col gap-5 pt-1">
        {efNudge && (
          <button
            onClick={() => {
              close();
              openEmergency();
            }}
            className="flex items-start gap-3 rounded-[14px] border border-warning/30 bg-warning-soft p-3.5 text-left"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-warning/15 text-warning">
              <ShieldAlert className="h-4.5 w-4.5" />
            </span>
            <span className="min-w-0">
              <span className="block text-[0.84rem] font-semibold text-text">Emergency fund first</span>
              <span className="block text-[0.76rem] leading-snug text-text-2">
                {ef.set
                  ? `It's ${formatINR(ef.short)} short. Keep 3–6 months safe before you invest — tap to top it up.`
                  : "Keep 3–6 months of expenses safe before you invest — tap to set one up."}
              </span>
            </span>
          </button>
        )}

        {/* Name */}
        <div>
          <p className="mb-2 px-0.5 text-[0.8rem] font-semibold text-text-2">Name</p>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nippon Small Cap SIP"
            className="h-12 text-[1rem]"
          />
        </div>

        {/* Type */}
        <div>
          <p className="mb-2 px-0.5 text-[0.8rem] font-semibold text-text-2">Type</p>
          <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
            {INVESTMENT_TYPES.map((k) => {
              const Icon = INVESTMENT_TYPE_META[k].icon;
              const active = type === k;
              return (
                <button
                  key={k}
                  onClick={() => setType(k)}
                  className={cn(
                    "flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-[0.82rem] font-medium transition-all",
                    active
                      ? "border-transparent bg-brand-soft text-brand-on-soft"
                      : "border-border bg-surface text-text-2 hover:border-border-strong",
                  )}
                >
                  <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
                  {INVESTMENT_TYPE_META[k].label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Current value */}
        <div>
          <p className="mb-2 px-0.5 text-[0.8rem] font-semibold text-text-2">Current value</p>
          <label className="flex items-center gap-2 rounded-[14px] border border-border bg-surface px-4 py-3 cursor-text">
            <span className="font-display text-lg font-semibold text-text-2">₹</span>
            <input
              value={value}
              onChange={(e) => setValue(sanitizeMoneyInput(e.target.value))}
              inputMode="decimal"
              placeholder="0"
              className="flex-1 bg-transparent font-display text-lg font-bold tnum outline-none placeholder:text-text-3"
            />
          </label>
        </div>

        {/* Amount invested (optional) */}
        <div>
          <p className="mb-2 px-0.5 text-[0.8rem] font-semibold text-text-2">Amount invested (optional)</p>
          <label className="flex items-center gap-2 rounded-[14px] border border-border bg-surface px-4 py-3 cursor-text">
            <span className="font-display text-lg font-semibold text-text-2">₹</span>
            <input
              value={invested}
              onChange={(e) => setInvested(sanitizeMoneyInput(e.target.value))}
              inputMode="decimal"
              placeholder="What you put in"
              className="flex-1 bg-transparent font-display text-lg font-bold tnum outline-none placeholder:text-text-3"
            />
          </label>
          {gain != null && (
            <p
              className={cn(
                "mt-2 flex items-center gap-1 px-0.5 text-[0.78rem] font-semibold",
                gain >= 0 ? "text-positive" : "text-negative",
              )}
            >
              {gain >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
              {gain >= 0 ? "+" : "−"}
              {formatINR(Math.abs(gain))} {gain >= 0 ? "gain" : "loss"} so far
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="sticky bottom-0 -mx-5 flex gap-3 border-t border-border bg-surface px-5 pb-1 pt-3">
          {editing && (
            <Button variant="dangerSoft" size="lg" onClick={remove} aria-label="Remove investment">
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          <Button variant="primary" size="lg" fullWidth disabled={!valid} onClick={save}>
            <Check className="h-4.5 w-4.5" /> {editing ? "Save changes" : "Add investment"}
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
