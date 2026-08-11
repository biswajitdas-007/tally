"use client";

import { useState } from "react";
import { ArrowRightLeft, Check } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { AccountPicker } from "./account-picker";
import { useStore, useMyId } from "@/store/useStore";
import { useUI } from "@/store/useUI";
import { useToast } from "@/components/ui/toast";
import { formatINR, sanitizeMoneyInput } from "@/lib/utils";
import { stampNow, liveLiabilityOutstanding } from "@/lib/liabilities";

export function TransferSheet() {
  const open = useUI((s) => s.transferOpen);
  const close = useUI((s) => s.closeTransfer);
  const initialToId = useUI((s) => s.transferToId);
  const accounts = useStore((s) => s.accounts);
  const liabilities = useStore((s) => s.liabilities);
  const finance = useStore((s) => s.finance);
  const expenses = useStore((s) => s.expenses);
  const addFinance = useStore((s) => s.addFinance);
  const setWealth = useStore((s) => s.setWealth);
  const myId = useMyId() ?? "";
  const { toast } = useToast();

  const [amount, setAmount] = useState("");
  const [fromId, setFromId] = useState<string | null>(null);
  const [toId, setToId] = useState<string | null>(null);
  const [wasOpen, setWasOpen] = useState(false);

  if (open && !wasOpen) {
    setWasOpen(true);
    setAmount("");
    setFromId(accounts[0]?.id ?? null);
    setToId(initialToId ?? accounts[1]?.id ?? null);
  } else if (!open && wasOpen) {
    setWasOpen(false);
  }

  const value = parseFloat(amount) || 0;
  const valid = value > 0 && fromId !== null && toId !== null && fromId !== toId;
  const cardLiability = liabilities.find((l) => l.id === toId && l.kind === "card");
  const isPayingCard = Boolean(cardLiability);
  const cardOutstanding = cardLiability ? liveLiabilityOutstanding(cardLiability, finance, expenses, myId) : 0;

  function transfer() {
    if (!valid) return;

    // Source (Bank account)
    addFinance({
      type: "expense",
      amount: value,
      category: "other",
      accountId: fromId!,
      transfer: true,
      note: "Transfer / Payment",
    });

    // Destination (Bank account or Credit Card)
    addFinance({
      type: "income",
      amount: value,
      category: "other",
      accountId: toId!,
      transfer: true,
      note: "Transfer / Payment",
    });

    // If destination is a credit card, mark it as paid for the month
    const card = liabilities.find((l) => l.id === toId && l.kind === "card");
    if (card) {
      setWealth({
        liabilities: liabilities.map((l) => (l.id === toId ? { ...l, lastPaidMonth: stampNow() } : l)),
      });
    }

    toast({ message: `${formatINR(value)} transferred` });
    close();
  }

  return (
    <Sheet open={open} onClose={close} title={isPayingCard ? "Pay credit card bill" : "Transfer money"}>
      <div className="flex flex-col gap-6 pt-1">
        <div>
          <p className="mb-2 px-0.5 text-[0.8rem] font-semibold text-text-2">Amount</p>
          <label className="flex items-center gap-2 rounded-[14px] border border-border bg-surface px-4 py-3 cursor-text">
            <span className="font-display text-lg font-semibold text-text-2">₹</span>
            <input
              value={amount}
              onChange={(e) => setAmount(sanitizeMoneyInput(e.target.value))}
              inputMode="decimal"
              autoFocus
              placeholder="0"
              className="flex-1 bg-transparent font-display text-lg font-bold tnum outline-none placeholder:text-text-3"
            />
          </label>
          {isPayingCard && cardOutstanding > 0 && (
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => setAmount(String(cardOutstanding))}
                className="rounded-full bg-brand/10 px-3 py-1 text-[0.75rem] font-semibold text-brand transition-colors hover:bg-brand/20"
              >
                Pay full balance: {formatINR(cardOutstanding)}
              </button>
            </div>
          )}
        </div>

        <div className="relative flex flex-col gap-4">
          <AccountPicker value={fromId} onChange={setFromId} label={isPayingCard ? "Pay from" : "From"} includeCards={false} />
          


          <AccountPicker value={toId} onChange={setToId} label={isPayingCard ? "Paying to" : "To (Account or Card)"} includeCards={true} cardsOnly={isPayingCard} />
        </div>

        <Button size="lg" onClick={transfer} disabled={!valid} className="mt-4 gap-2">
          <Check className="h-[18px] w-[18px]" strokeWidth={2.5} />
          {isPayingCard ? "Confirm payment" : "Confirm transfer"}
        </Button>
      </div>
    </Sheet>
  );
}
