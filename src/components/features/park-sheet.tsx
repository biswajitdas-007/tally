"use client";

import { useState } from "react";
import { Check, PiggyBank } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { AccountPicker } from "./account-picker";
import { useStore, useMyId } from "@/store/useStore";
import { useUI } from "@/store/useUI";
import { useToast } from "@/components/ui/toast";
import { unparkedAmount } from "@/lib/accounts";
import { formatINR, clamp } from "@/lib/utils";

export function ParkSheet() {
  const open = useUI((s) => s.parkOpen);
  const close = useUI((s) => s.closePark);
  const finance = useStore((s) => s.finance);
  const expenses = useStore((s) => s.expenses);
  const accounts = useStore((s) => s.accounts);
  const addFinance = useStore((s) => s.addFinance);
  const myId = useMyId() ?? "";
  const { toast } = useToast();

  const unparked = unparkedAmount(finance, expenses, accounts, myId);

  const [amount, setAmount] = useState("");
  const [accountId, setAccountId] = useState<string | null>(null);
  const [wasOpen, setWasOpen] = useState(false);
  if (open && !wasOpen) {
    setWasOpen(true);
    setAmount(unparked > 0 ? String(Math.round(unparked)) : "");
    setAccountId(accounts[0]?.id ?? null);
  } else if (!open && wasOpen) {
    setWasOpen(false);
  }

  const value = clamp(parseFloat(amount) || 0, 0, unparked);
  const valid = value > 0 && accountId !== null;

  function park() {
    if (!valid) return;
    addFinance({ type: "income", amount: value, category: "other", accountId: accountId!, transfer: true, note: "Parked" });
    toast({ message: `${formatINR(value)} parked` });
    close();
  }

  return (
    <Sheet open={open} onClose={close} title="Park received money">
      <div className="flex flex-col gap-5 pt-1">
        <div className="flex items-center gap-3 rounded-[16px] bg-surface-inset p-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-soft text-brand">
            <PiggyBank className="h-5 w-5" />
          </span>
          <div>
            <p className="text-[0.72rem] font-semibold uppercase tracking-wide text-text-3">Unparked</p>
            <p className="mt-0.5 font-display text-xl font-bold tnum text-text">{formatINR(unparked)}</p>
          </div>
        </div>

        <div>
          <p className="mb-2 px-0.5 text-[0.8rem] font-semibold text-text-2">Amount to park</p>
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

        <AccountPicker value={accountId} onChange={setAccountId} label="Into which account?" />

        <div className="sticky bottom-0 -mx-5 border-t border-border bg-surface px-5 pb-1 pt-3">
          <Button variant="primary" size="lg" fullWidth disabled={!valid} onClick={park}>
            <Check className="h-4.5 w-4.5" /> Park {value > 0 ? formatINR(value) : ""}
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
