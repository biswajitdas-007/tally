"use client";

import { useState } from "react";
import { Check, Trash2 } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useStore, useMyId } from "@/store/useStore";
import { useUI } from "@/store/useUI";
import { useToast } from "@/components/ui/toast";
import { withLiveBalances } from "@/lib/accounts";
import { avgMonthly, suggestedEmergency } from "@/lib/health";
import { monthlyEmi } from "@/lib/money";
import { ACCOUNT_KIND_META } from "@/lib/categories";
import { formatINR, cn , sanitizeMoneyInput} from "@/lib/utils";
import type { AccountKind } from "@/lib/types";

function AccountOption({ label, sub, active, onClick }: { label: string; sub: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-[13px] border px-3.5 py-2.5 text-left transition-all",
        active ? "border-brand/50 bg-brand-soft" : "border-border bg-surface hover:border-border-strong",
      )}
    >
      <span
        className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
          active ? "border-brand bg-brand text-on-brand" : "border-border-strong",
        )}
      >
        {active && <Check className="h-3 w-3" strokeWidth={3} />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[0.88rem] font-medium text-text">{label}</span>
        <span className="block truncate text-[0.72rem] text-text-3">{sub}</span>
      </span>
    </button>
  );
}

export function EmergencySheet() {
  const open = useUI((s) => s.emergencyOpen);
  const close = useUI((s) => s.closeEmergency);
  const emergency = useStore((s) => s.emergency);
  const setEmergency = useStore((s) => s.setEmergency);
  const accounts = useStore((s) => s.accounts);
  const finance = useStore((s) => s.finance);
  const expenses = useStore((s) => s.expenses);
  const liabilities = useStore((s) => s.liabilities);
  const myId = useMyId() ?? "";
  const { toast } = useToast();

  const liveAccounts = withLiveBalances(accounts, finance, expenses, myId).filter((a) => a.kind !== "investment");
  const outflow = avgMonthly(finance, expenses, myId).spend + monthlyEmi(liabilities);
  const suggested = suggestedEmergency(outflow);

  const [amount, setAmount] = useState("");
  const [accountId, setAccountId] = useState<string | null>(null);
  const [wasOpen, setWasOpen] = useState(false);
  if (open && !wasOpen) {
    setWasOpen(true);
    setAmount(emergency?.target ? String(emergency.target) : suggested ? String(suggested) : "");
    setAccountId(emergency?.accountId ?? null);
  } else if (!open && wasOpen) {
    setWasOpen(false);
  }

  const target = parseFloat(amount) || 0;

  function save() {
    if (target <= 0) return;
    setEmergency({ target, accountId: accountId ?? undefined });
    toast({ message: "Emergency fund set" });
    close();
  }

  return (
    <Sheet
      open={open}
      onClose={close}
      title="Emergency fund"
      description="Money kept safe for a rainy day — build it before you invest."
    >
      <div className="flex flex-col gap-5 pt-1">
        {/* Target amount */}
        <div>
          <p className="mb-2 px-0.5 text-[0.8rem] font-semibold text-text-2">Target amount</p>
          <div className="flex items-center gap-2 rounded-[14px] border border-border bg-surface px-4 py-3">
            <span className="font-display text-lg font-semibold text-text-2">₹</span>
            <input
              value={amount}
              onChange={(e) => setAmount(sanitizeMoneyInput(e.target.value))}
              inputMode="decimal"
              placeholder="100000"
              className="flex-1 bg-transparent font-display text-lg font-bold tnum outline-none placeholder:text-text-3"
            />
          </div>
          {suggested > 0 && (
            <button onClick={() => setAmount(String(suggested))} className="mt-2 text-[0.76rem] font-medium text-brand">
              Suggested: {formatINR(suggested)} · about 6 months of your spending
            </button>
          )}
        </div>

        {/* Where it's kept */}
        <div>
          <p className="mb-2 px-0.5 text-[0.8rem] font-semibold text-text-2">Where&apos;s it kept?</p>
          <div className="flex flex-col gap-1.5">
            <AccountOption
              label="Not linked · any savings"
              sub="Compared to your total liquid savings"
              active={accountId === null}
              onClick={() => setAccountId(null)}
            />
            {liveAccounts.map((a) => (
              <AccountOption
                key={a.id}
                label={a.name}
                sub={`${ACCOUNT_KIND_META[a.kind as AccountKind].label} · ${formatINR(a.balance)}`}
                active={accountId === a.id}
                onClick={() => setAccountId(a.id)}
              />
            ))}
          </div>
          <p className="mt-2 px-0.5 text-[0.72rem] leading-snug text-text-3">
            Link an account to track it exactly — we&apos;ll warn you if its balance drops below your target.
          </p>
        </div>

        {/* Actions */}
        <div className="sticky bottom-0 -mx-5 flex gap-3 border-t border-border bg-surface px-5 pb-1 pt-3">
          {emergency && (
            <Button
              variant="dangerSoft"
              size="lg"
              onClick={() => {
                setEmergency(null);
                toast({ message: "Emergency fund removed", tone: "info" });
                close();
              }}
              aria-label="Remove emergency fund"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          <Button variant="primary" size="lg" fullWidth disabled={target <= 0} onClick={save}>
            <Check className="h-4.5 w-4.5" /> {emergency ? "Save" : "Set emergency fund"}
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
