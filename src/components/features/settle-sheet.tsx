"use client";

import { useMemo, useState } from "react";
import { Check, Copy, Share2 } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { AccountPicker } from "./account-picker";
import { useStore, useMe, useMyId } from "@/store/useStore";
import { useUI } from "@/store/useUI";
import { useToast } from "@/components/ui/toast";
import { scopedDebts, type ScopeAmount, type ScopeId } from "@/lib/balances";
import { isValidVpa } from "@/lib/upi";
import { formatINR, cn } from "@/lib/utils";
import { celebrate } from "@/lib/celebrate";

const scopeKey = (id: ScopeId) => id ?? "__direct__";

export function SettleSheet() {
  const target = useUI((s) => s.settle);
  const close = useUI((s) => s.closeSettle);
  const settleUp = useStore((s) => s.settleUp);
  const updateProfile = useStore((s) => s.updateProfile);
  const people = useStore((s) => s.people);
  const expenses = useStore((s) => s.expenses);
  const groups = useStore((s) => s.groups);
  const accounts = useStore((s) => s.accounts);
  const me = useMe();
  const myId = useMyId() ?? "";
  const { toast } = useToast();

  const [upiDraft, setUpiDraft] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [accountId, setAccountId] = useState<string | null>(null);
  const [lastTarget, setLastTarget] = useState(target);

  const scopes = useMemo<ScopeAmount[]>(() => {
    if (!target) return [];
    if (target.groupId === undefined) {
      const debt = scopedDebts(expenses, myId).find((d) => d.personId === target.personId);
      return debt?.scopes ?? [];
    }
    return [{ scopeId: target.groupId ?? null, amount: target.amount }];
  }, [target, expenses, myId]);

  if (target !== lastTarget) {
    setLastTarget(target);
    setSelected(new Set(scopes.map((s) => scopeKey(s.scopeId))));
    setUpiDraft("");
    setAccountId(accounts[0]?.id ?? null);
  }

  const person = target ? people.find((p) => p.id === target.personId) ?? null : null;
  const multiScope = scopes.length > 1;
  const scopeLabel = (id: ScopeId) => (id === null ? "Direct" : groups.find((g) => g.id === id)?.name ?? "Group");

  const activeScopes = scopes.filter((s) => selected.has(scopeKey(s.scopeId)));
  const selectedNet = activeScopes.reduce((a, s) => a + s.amount, 0);
  const youPay = selectedNet < -0.01;
  const amount = Math.abs(selectedNet);

  // Who receives the money. Tally doesn't move it — we just show their UPI ID to
  // copy + pay in any UPI app, and record the settlement.
  const payee = youPay ? person : me;
  const payer = youPay ? me : person;
  const payeeUpi = payee?.upiId && isValidVpa(payee.upiId) ? payee.upiId : null;

  if (!target || !person) return null;

  function toggle(id: ScopeId) {
    const key = scopeKey(id);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function copyUpi() {
    if (!payeeUpi) return;
    navigator.clipboard.writeText(payeeUpi).catch(() => {});
    toast({ message: "UPI ID copied" });
  }

  function confirmSettled() {
    for (const s of activeScopes) {
      if (s.amount < -0.01)
        settleUp({ from: myId, to: person!.id, amount: Math.abs(s.amount), groupId: s.scopeId, accountId: accountId ?? undefined });
      else if (s.amount > 0.01)
        settleUp({ from: person!.id, to: myId, amount: s.amount, groupId: s.scopeId, accountId: accountId ?? undefined });
    }
    toast({ message: youPay ? `Settled up with ${person!.name.split(" ")[0]}` : "Payment recorded" });
    celebrate();
    close();
  }

  async function shareReminder() {
    const text = `Hi ${person!.name.split(" ")[0]}, you owe me ${formatINR(amount)} on Tally.${
      me?.upiId ? ` Pay to ${me.upiId}` : ""
    }`;
    if (navigator.share) await navigator.share({ text }).catch(() => {});
    else {
      await navigator.clipboard.writeText(text).catch(() => {});
      toast({ message: "Reminder copied to clipboard" });
    }
  }

  const needsOwnUpi = !youPay && amount >= 0.01 && !payeeUpi; // they owe you but you have no UPI id
  const nothingSelected = activeScopes.length === 0;

  return (
    <Sheet open onClose={close} title={youPay ? "Settle up" : "Request payment"}>
      <div className="flex flex-col gap-5 pt-1">
        {/* Direction summary */}
        <div className="flex items-center justify-center gap-3">
          <div className="flex flex-col items-center gap-1">
            <Avatar person={payer} size="lg" />
            <span className="text-[0.72rem] text-text-3">{payer?.id === myId ? "You" : payer?.name.split(" ")[0]}</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="font-display text-2xl font-bold text-text tnum">{formatINR(amount)}</span>
            <div className="mt-0.5 h-px w-16 bg-border-strong" />
            <span className="mt-0.5 text-[0.68rem] uppercase tracking-wide text-text-3">pays</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Avatar person={payee} size="lg" />
            <span className="text-[0.72rem] text-text-3">{payee?.id === myId ? "You" : payee?.name.split(" ")[0]}</span>
          </div>
        </div>

        {/* Pick which ledgers to settle (only when there's more than one) */}
        {multiScope && (
          <div>
            <p className="mb-2 px-0.5 text-[0.8rem] font-semibold text-text-2">What to settle</p>
            <div className="flex flex-col gap-1.5">
              {scopes.map((s) => {
                const on = selected.has(scopeKey(s.scopeId));
                const owe = s.amount < 0;
                return (
                  <button
                    key={scopeKey(s.scopeId)}
                    onClick={() => toggle(s.scopeId)}
                    className={cn(
                      "flex items-center gap-3 rounded-[13px] border px-3.5 py-3 text-left transition-all",
                      on ? "border-brand/50 bg-brand-soft" : "border-border bg-surface",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors",
                        on ? "border-brand bg-brand text-on-brand" : "border-border-strong",
                      )}
                    >
                      {on && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[0.9rem] font-medium text-text">{scopeLabel(s.scopeId)}</span>
                    <span className={cn("tnum text-[0.85rem] font-semibold", owe ? "text-negative" : "text-positive")}>
                      {owe ? "you owe " : "owes you "}
                      {formatINR(Math.abs(s.amount))}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* UPI ID to copy — Tally records the settlement; you pay in your own app */}
        {amount >= 0.01 && payeeUpi ? (
          <div className="rounded-[16px] border border-border bg-surface-2 p-4">
            <p className="text-[0.72rem] font-semibold uppercase tracking-wide text-text-3">
              {youPay ? `Pay ${person.name.split(" ")[0]} at` : "Your UPI ID"}
            </p>
            <div className="mt-1.5 flex items-center gap-2">
              <span className="min-w-0 flex-1 truncate font-display text-[1.05rem] font-bold text-text">{payeeUpi}</span>
              <Button variant="secondary" size="sm" onClick={copyUpi}>
                <Copy className="h-4 w-4" /> Copy
              </Button>
            </div>
            <p className="mt-2 text-[0.78rem] leading-snug text-text-2">
              {youPay
                ? "Copy their UPI ID, pay in any UPI app, then mark it paid below."
                : `Share this so ${person.name.split(" ")[0]} can pay you, then mark it received.`}
            </p>
          </div>
        ) : needsOwnUpi ? (
          <div className="rounded-[16px] border border-border bg-surface-2 p-4">
            <p className="text-sm font-semibold text-text">Add your UPI ID</p>
            <p className="mt-0.5 text-[0.82rem] text-text-2">So {person.name.split(" ")[0]} can pay you directly.</p>
            <div className="mt-3 flex gap-2">
              <Input value={upiDraft} onChange={(e) => setUpiDraft(e.target.value)} placeholder="yourname@okhdfcbank" className="h-11" />
              <Button
                disabled={!isValidVpa(upiDraft)}
                onClick={() => {
                  updateProfile({ upiId: upiDraft.trim() });
                  toast({ message: "UPI ID saved" });
                }}
              >
                Save
              </Button>
            </div>
          </div>
        ) : amount >= 0.01 && youPay ? (
          <p className="rounded-[16px] border border-border bg-surface-2 p-4 text-[0.84rem] leading-snug text-text-2">
            {person.name.split(" ")[0]} hasn&apos;t added a UPI ID yet. Pay them however you like, then mark it settled below.
          </p>
        ) : null}

        {/* Remind them (they owe you) */}
        {!youPay && amount >= 0.01 && (
          <Button variant="secondary" size="md" onClick={shareReminder}>
            <Share2 className="h-4 w-4" /> Send a reminder
          </Button>
        )}

        {/* Which account this cash moved through */}
        {amount >= 0.01 && (
          <AccountPicker value={accountId} onChange={setAccountId} label={youPay ? "Paid from" : "Received into (optional)"} />
        )}

        {/* Confirm */}
        <div className="sticky bottom-0 -mx-5 border-t border-border bg-surface px-5 pb-1 pt-3">
          <Button variant="primary" size="lg" fullWidth disabled={nothingSelected} onClick={confirmSettled}>
            <Check className="h-4.5 w-4.5" />
            {amount < 0.01 ? "Mark settled" : youPay ? `I've paid ${formatINR(amount)}` : `Mark ${formatINR(amount)} received`}
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
