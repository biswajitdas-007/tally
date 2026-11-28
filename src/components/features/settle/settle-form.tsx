"use client";

import { useRef, useState } from "react";
import { Check, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SheetFooter } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { useStore, useMe } from "@/store/useStore";
import { celebrate } from "@/lib/celebrate";
import { upiPayUri } from "@/lib/upi";
import { formatINR } from "@/lib/utils";
import {
  confirmLabel,
  firstName,
  paymentParties,
  reminderText,
  scopeKey,
  settleScopes,
  settleSummary,
  settledMessage,
  settlementEntries,
  upiNote,
  type SettleTarget,
} from "@/lib/settle";
import type { ScopeAmount, ScopeId } from "@/lib/balances";
import type { ID, Person } from "@/lib/types";
import { SettleHero } from "./settle-hero";
import { ScopeChecklist } from "./scope-checklist";
import { SettlePayment } from "./settle-payment";

/**
 * Settle up with one person. Mounted fresh each time the sheet opens (keyed per
 * open), so its state starts from props.
 *
 * The balances stay live while it's open — if the other side marks it received
 * meanwhile, it drops out rather than getting recorded twice — and freeze only
 * once you confirm, so the sheet keeps showing what you settled as it slides away.
 */
export function SettleForm({
  target,
  person,
  myId,
  onDone,
}: Readonly<{ target: SettleTarget; person: Person; myId: ID; onDone: () => void }>) {
  const expenses = useStore((s) => s.expenses);
  const groups = useStore((s) => s.groups);
  const settleUp = useStore((s) => s.settleUp);
  const me = useMe();
  const { toast } = useToast();

  const [frozen, setFrozen] = useState<ScopeAmount[] | null>(null);
  const [unticked, setUnticked] = useState<ReadonlySet<string>>(() => new Set());
  // Guards the record step itself, so a second tap before the re-render lands can't repeat it.
  const recorded = useRef(false);

  const scopes = frozen ?? settleScopes(target, expenses, myId);
  const summary = settleSummary(scopes, unticked);
  const { youPay, amount, settled, active } = summary;
  const name = firstName(person.name);
  const { payer, payee, payeeUpi } = paymentParties(youPay, me, person);
  const groupName = (id: string) => groups.find((g) => g.id === id)?.name;
  const labelOf = (id: ScopeId) => (id === null ? "Direct" : (groupName(id) ?? "Group"));
  const payUri =
    payeeUpi && !settled ? upiPayUri({ vpa: payeeUpi, name: payee?.name, amount, note: upiNote(active, groupName) }) : null;

  function toggle(id: ScopeId, on: boolean) {
    setUnticked((prev) => {
      const next = new Set(prev);
      if (on) next.delete(scopeKey(id));
      else next.add(scopeKey(id));
      return next;
    });
  }

  function confirm() {
    if (recorded.current || active.length === 0) return;
    recorded.current = true;
    setFrozen(scopes);
    for (const entry of settlementEntries(active, myId, person.id)) settleUp(entry);
    toast({ message: settledMessage(summary, name) });
    celebrate();
    onDone();
  }

  async function remind() {
    const text = reminderText(name, formatINR(amount), me?.upiId);
    if (navigator.share) {
      await navigator.share({ text }).catch(() => {});
      return;
    }
    await navigator.clipboard
      .writeText(text)
      .then(() => toast({ message: "Reminder copied to clipboard" }))
      .catch(() => toast({ message: "Couldn't copy the reminder", tone: "info" }));
  }

  return (
    <div className="flex flex-col gap-5 pt-1">
      <SettleHero payer={payer} payee={payee} name={name} amount={amount} youPay={youPay} settled={settled} />

      {scopes.length > 1 && <ScopeChecklist scopes={scopes} unticked={unticked} labelOf={labelOf} onToggle={toggle} />}

      <SettlePayment
        youPay={youPay}
        settled={settled}
        name={name}
        payeeUpi={payeeUpi}
        payUri={payUri}
        payeeName={payee?.name ?? name}
        amount={amount}
      />

      {!youPay && !settled && (
        <Button variant="secondary" onClick={remind}>
          <Share2 className="size-4" strokeWidth={1.8} aria-hidden /> Send a reminder
        </Button>
      )}

      <SheetFooter>
        <Button size="lg" fullWidth disabled={active.length === 0} onClick={confirm} className="h-14 rounded-full text-base font-bold">
          <Check className="size-5" strokeWidth={2.6} aria-hidden />
          {confirmLabel(summary, formatINR(amount))}
        </Button>
      </SheetFooter>
    </div>
  );
}
