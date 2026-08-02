"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CalendarClock, Check } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useStore } from "@/store/useStore";
import { useToast } from "@/components/ui/toast";
import { manualDue, pendingEmis } from "@/lib/liabilities";
import { formatINR } from "@/lib/utils";

const PERIOD_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

/** Asks the user to confirm they paid a manual loan's EMI before counting it. */
export function EmiConfirm() {
  const liabilities = useStore((s) => s.liabilities);
  const confirmEmi = useStore((s) => s.confirmEmi);
  const dataReady = useStore((s) => s.dataReady);
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasTarget = searchParams.has("confirmEmi") || searchParams.has("period");
  const targetId = searchParams.get("confirmEmi");
  const targetPeriod = searchParams.get("period");
  const validTargetQuery = Boolean(targetId && targetPeriod && PERIOD_RE.test(targetPeriod));

  const targetedLiability = validTargetQuery ? liabilities.find((l) => l.id === targetId) ?? null : null;
  const targetedPeriods = targetedLiability ? pendingEmis(targetedLiability) : [];
  const validTarget = Boolean(
    targetedLiability && targetPeriod && targetedPeriods.includes(targetPeriod) && manualDue(targetedLiability),
  );

  const due = dataReady
    ? hasTarget
      ? validTarget
        ? targetedLiability
        : null
      : liabilities.find((l) => manualDue(l) && !dismissed.has(l.id)) ?? null
    : null;
  const duePeriods = due ? pendingEmis(due) : [];
  const count = duePeriods.length;
  const total = (due?.emi ?? 0) * count;

  const clearTarget = useCallback(() => {
    if (!hasTarget) return;
    const next = new URLSearchParams(searchParams.toString());
    next.delete("confirmEmi");
    next.delete("period");
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [hasTarget, pathname, router, searchParams]);

  useEffect(() => {
    if (dataReady && hasTarget && !validTarget) clearTarget();
  }, [clearTarget, dataReady, hasTarget, validTarget]);

  if (!due) return null;
  const current = due;

  async function confirm() {
    if (busy || count === 0) return;
    setBusy(true);
    setError(null);
    const period = hasTarget ? targetPeriod! : duePeriods[duePeriods.length - 1];
    const result = await confirmEmi(current.id, period);
    setBusy(false);

    if (!result.ok) {
      setError("Couldn\u2019t confirm this EMI. Please try again.");
      return;
    }

    setDismissed((prev) => new Set(prev).add(current.id));
    if (hasTarget) {
      clearTarget();
    }
    toast({
      message: result.alreadyHandled
        ? "EMI was already marked paid"
        : result.applied.length > 1
          ? `${result.applied.length} EMIs marked paid`
          : "EMI marked paid",
    });
  }

  function later() {
    if (busy) return;
    setError(null);
    setDismissed((prev) => new Set(prev).add(current.id));
    if (hasTarget) {
      clearTarget();
    }
  }

  return (
    <Sheet open onClose={later} title="EMI reminder">
      <div className="flex flex-col items-center gap-5 pt-1 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-soft text-brand">
          <CalendarClock className="h-7 w-7" />
        </span>
        <div>
          <p className="text-[0.95rem] text-text-2">
            {count > 1 ? `Did you pay ${count} overdue EMIs for` : "Did you pay the EMI due for"}
          </p>
          <p className="mt-1 font-display text-xl font-bold text-text">{due.lender || due.name}?</p>
          {due.emi != null && (
            <p className="mt-1 text-[0.85rem] text-text-3">
              {formatINR(total)}
              {count > 1 ? ` total · ${count} × ${formatINR(due.emi)}` : ""}
              {due.termMonths ? ` · ${due.emisPaid ?? 0}/${due.termMonths} paid` : ""}
            </p>
          )}
          {error && <p className="mt-3 text-[0.82rem] font-medium text-negative">{error}</p>}
        </div>
        <div className="flex w-full gap-3">
          <Button variant="secondary" size="lg" fullWidth disabled={busy} onClick={later}>
            Not yet
          </Button>
          <Button variant="primary" size="lg" fullWidth loading={busy} onClick={confirm}>
            <Check className="h-4.5 w-4.5" /> Yes, paid
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
