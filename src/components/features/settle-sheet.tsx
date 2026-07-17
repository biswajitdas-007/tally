"use client";

import { useMemo, useState } from "react";
import { Check, Copy, Share2, QrCode as QrIcon } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { UpiQR } from "./upi-qr";
import { AccountPicker } from "./account-picker";
import { useStore, useMe, useMyId } from "@/store/useStore";
import { useUI } from "@/store/useUI";
import { useToast } from "@/components/ui/toast";
import { scopedDebts, type ScopeAmount, type ScopeId } from "@/lib/balances";
import { buildAppUri, buildUpiUri, isValidVpa, UPI_APPS } from "@/lib/upi";
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
  const me = useMe();
  const myId = useMyId() ?? "";
  const { toast } = useToast();

  const [upiDraft, setUpiDraft] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [accountId, setAccountId] = useState<string | null>(null);
  const [lastTarget, setLastTarget] = useState(target);

  // Which ledgers this settle covers. `groupId === undefined` ⇒ person-level:
  // pull every scope you share with them. Otherwise it's a single scope.
  const scopes = useMemo<ScopeAmount[]>(() => {
    if (!target) return [];
    if (target.groupId === undefined) {
      const debt = scopedDebts(expenses, myId).find((d) => d.personId === target.personId);
      return debt?.scopes ?? [];
    }
    return [{ scopeId: target.groupId ?? null, amount: target.amount }];
  }, [target, expenses, myId]);

  // Reset selection (all scopes) + draft whenever the sheet opens for a new
  // target — adjusting state during render, no effect needed.
  if (target !== lastTarget) {
    setLastTarget(target);
    setSelected(new Set(scopes.map((s) => scopeKey(s.scopeId))));
    setUpiDraft("");
    setAccountId(null);
  }

  const person = target ? people.find((p) => p.id === target.personId) ?? null : null;
  const multiScope = scopes.length > 1;
  const scopeLabel = (id: ScopeId) => (id === null ? "Direct" : groups.find((g) => g.id === id)?.name ?? "Group");

  const activeScopes = scopes.filter((s) => selected.has(scopeKey(s.scopeId)));
  const selectedNet = activeScopes.reduce((a, s) => a + s.amount, 0);
  const youPay = selectedNet < -0.01;
  const amount = Math.abs(selectedNet);

  // Who receives the money in this settlement.
  const payee = youPay ? person : me;
  const payer = youPay ? me : person;
  const note = "Tally settle up";

  const upiUri = useMemo(() => {
    if (!payee?.upiId || !isValidVpa(payee.upiId) || amount < 0.01) return null;
    return buildUpiUri({ vpa: payee.upiId, name: payee.name, amount, note });
  }, [payee, amount]);

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

  function confirmSettled() {
    // Record a settlement in each selected ledger so only those scopes clear.
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
    if (navigator.share) {
      await navigator.share({ text }).catch(() => {});
    } else {
      await navigator.clipboard.writeText(text).catch(() => {});
      toast({ message: "Reminder copied to clipboard" });
    }
  }

  const needsOwnUpi = !youPay && amount >= 0.01 && !upiUri; // they owe you but you have no UPI id
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
                    <span className="min-w-0 flex-1 truncate text-[0.9rem] font-medium text-text">
                      {scopeLabel(s.scopeId)}
                    </span>
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

        {needsOwnUpi ? (
          /* You need a UPI id to receive */
          <div className="rounded-[16px] border border-border bg-surface-2 p-4">
            <p className="text-sm font-semibold text-text">Add your UPI ID</p>
            <p className="mt-0.5 text-[0.82rem] text-text-2">
              So {person.name.split(" ")[0]} can scan and pay you directly.
            </p>
            <div className="mt-3 flex gap-2">
              <Input
                value={upiDraft}
                onChange={(e) => setUpiDraft(e.target.value)}
                placeholder="yourname@okhdfcbank"
                className="h-11"
              />
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
        ) : upiUri ? (
          /* The receipt-style UPI card */
          <div className="relative mx-auto w-full max-w-[300px] overflow-hidden rounded-[20px] bg-white text-[#15201a] shadow-[var(--shadow-md)]">
            <div className="px-5 pb-3 pt-4 text-center">
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-[#8b958c]">
                {youPay ? "Paying" : "Pay to"}
              </p>
              <p className="mt-0.5 font-display text-lg font-bold">{payee?.name}</p>
              <p className="text-[0.8rem] text-[#58645c]">{payee?.upiId}</p>
            </div>

            {/* Perforation */}
            <div className="relative">
              <div
                className="absolute left-0 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full"
                style={{ background: "var(--surface)" }}
              />
              <div
                className="absolute right-0 top-1/2 h-4 w-4 translate-x-1/2 -translate-y-1/2 rounded-full"
                style={{ background: "var(--surface)" }}
              />
              <div className="mx-5 border-t-2 border-dashed border-[#e5e8e0]" />
            </div>

            <div className="flex flex-col items-center px-5 py-5">
              <div className="rounded-2xl border border-[#eceee9] p-3">
                <UpiQR value={upiUri} size={168} />
              </div>
              <p className="mt-3 flex items-center gap-1.5 text-[0.78rem] font-medium text-[#58645c]">
                <QrIcon className="h-3.5 w-3.5" />
                Scan with any UPI app
              </p>
              <p className="mt-3 font-display text-3xl font-bold tracking-tight tnum">{formatINR(amount)}</p>
            </div>
          </div>
        ) : null}

        {/* Pick a UPI app to pay with (opens that exact app, prefilled) */}
        {youPay && upiUri && (
          <div>
            <p className="mb-2 px-0.5 text-[0.8rem] font-semibold text-text-2">Pay with your UPI app</p>
            <div className="grid grid-cols-2 gap-2">
              {UPI_APPS.map((app) => (
                <a
                  key={app.id}
                  href={buildAppUri(app, { vpa: payee!.upiId!, name: payee!.name, amount, note })}
                  className="flex items-center justify-center gap-2 rounded-[13px] border border-border bg-surface py-3.5 text-[0.9rem] font-semibold text-text transition-all hover:border-border-strong hover:bg-surface-2 active:scale-[0.98]"
                >
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: app.color }} />
                  {app.label}
                </a>
              ))}
            </div>
            <p className="mt-2 px-0.5 text-[0.72rem] text-text-3">Don&apos;t have these? Scan the QR with any UPI app.</p>
          </div>
        )}

        {/* Secondary actions */}
        <div className="flex gap-2">
          {upiUri && (
            <Button
              variant="secondary"
              size="md"
              className="flex-1"
              onClick={() => {
                navigator.clipboard.writeText(payee!.upiId!).catch(() => {});
                toast({ message: "UPI ID copied" });
              }}
            >
              <Copy className="h-4 w-4" /> Copy ID
            </Button>
          )}
          {!youPay && amount >= 0.01 && (
            <Button variant="secondary" size="md" className="flex-1" onClick={shareReminder}>
              <Share2 className="h-4 w-4" /> Remind
            </Button>
          )}
        </div>

        {/* Which account this cash moved through */}
        {amount >= 0.01 && (
          <AccountPicker value={accountId} onChange={setAccountId} label={youPay ? "Paid from" : "Received into (optional)"} />
        )}

        {/* Confirm */}
        <div className="sticky bottom-0 -mx-5 border-t border-border bg-surface px-5 pb-1 pt-3">
          <Button variant="primary" size="lg" fullWidth disabled={nothingSelected} onClick={confirmSettled}>
            <Check className="h-4.5 w-4.5" />
            {amount < 0.01
              ? "Mark settled"
              : youPay
                ? `I've paid ${formatINR(amount)}`
                : `Mark ${formatINR(amount)} received`}
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
