"use client";

import { useState } from "react";
import { CalendarClock, Check } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useStore } from "@/store/useStore";
import { useToast } from "@/components/ui/toast";
import { manualDue, markManualPaid } from "@/lib/liabilities";
import { formatINR } from "@/lib/utils";

/** Asks the user to confirm they paid a manual loan's EMI before counting it. */
export function EmiConfirm() {
  const liabilities = useStore((s) => s.liabilities);
  const setWealth = useStore((s) => s.setWealth);
  const dataReady = useStore((s) => s.dataReady);
  const { toast } = useToast();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const due = dataReady ? liabilities.find((l) => manualDue(l) && !dismissed.has(l.id)) ?? null : null;
  if (!due) return null;

  function confirm() {
    setWealth({ liabilities: liabilities.map((l) => (l.id === due!.id ? markManualPaid(l) : l)) });
    toast({ message: "EMI marked paid" });
    setDismissed((prev) => new Set(prev).add(due!.id));
  }
  function later() {
    setDismissed((prev) => new Set(prev).add(due!.id));
  }

  return (
    <Sheet open onClose={later} title="EMI reminder">
      <div className="flex flex-col items-center gap-5 pt-1 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-soft text-brand">
          <CalendarClock className="h-7 w-7" />
        </span>
        <div>
          <p className="text-[0.95rem] text-text-2">Did you pay this month&apos;s EMI for</p>
          <p className="mt-1 font-display text-xl font-bold text-text">{due.lender || due.name}?</p>
          {due.emi != null && (
            <p className="mt-1 text-[0.85rem] text-text-3">
              {formatINR(due.emi)}
              {due.termMonths ? ` · ${due.emisPaid ?? 0}/${due.termMonths} paid` : ""}
            </p>
          )}
        </div>
        <div className="flex w-full gap-3">
          <Button variant="secondary" size="lg" fullWidth onClick={later}>
            Not yet
          </Button>
          <Button variant="primary" size="lg" fullWidth onClick={confirm}>
            <Check className="h-4.5 w-4.5" /> Yes, paid
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
