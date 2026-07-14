"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Copy, Share2, QrCode as QrIcon } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { UpiQR } from "./upi-qr";
import { useStore, useMe } from "@/store/useStore";
import { useUI } from "@/store/useUI";
import { useToast } from "@/components/ui/toast";
import { ME_ID } from "@/lib/seed";
import { buildAppUri, buildUpiUri, isAndroid, isValidVpa, UPI_APPS } from "@/lib/upi";
import { formatINR } from "@/lib/utils";

export function SettleSheet() {
  const target = useUI((s) => s.settle);
  const close = useUI((s) => s.closeSettle);
  const settleUp = useStore((s) => s.settleUp);
  const updatePerson = useStore((s) => s.updatePerson);
  const people = useStore((s) => s.people);
  const me = useMe();
  const { toast } = useToast();

  const [android, setAndroid] = useState(false);
  const [upiDraft, setUpiDraft] = useState("");

  useEffect(() => setAndroid(isAndroid()), []);
  useEffect(() => {
    if (target) setUpiDraft("");
  }, [target]);

  const person = target ? people.find((p) => p.id === target.personId) ?? null : null;
  const youOwe = (target?.amount ?? 0) < 0;
  const amount = Math.abs(target?.amount ?? 0);

  // Who receives the money in this settlement.
  const payee = youOwe ? person : me;
  const payer = youOwe ? me : person;
  const note = "Tally settle up";

  const upiUri = useMemo(() => {
    if (!payee?.upiId || !isValidVpa(payee.upiId)) return null;
    return buildUpiUri({ vpa: payee.upiId, name: payee.name, amount, note });
  }, [payee, amount]);

  if (!target || !person) return null;

  function confirmSettled() {
    if (youOwe) settleUp({ from: ME_ID, to: person!.id, amount, groupId: target!.groupId ?? null });
    else settleUp({ from: person!.id, to: ME_ID, amount, groupId: target!.groupId ?? null });
    toast({ message: youOwe ? `Settled up with ${person!.name.split(" ")[0]}` : "Payment recorded" });
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

  const needsOwnUpi = !youOwe && !upiUri; // they owe you but you have no UPI id

  return (
    <Sheet open onClose={close} title={youOwe ? "Settle up" : "Request payment"}>
      <div className="flex flex-col gap-5 pt-1">
        {/* Direction summary */}
        <div className="flex items-center justify-center gap-3">
          <div className="flex flex-col items-center gap-1">
            <Avatar person={payer} size="lg" />
            <span className="text-[0.72rem] text-text-3">{payer?.id === ME_ID ? "You" : payer?.name.split(" ")[0]}</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="font-display text-2xl font-bold text-text tnum">{formatINR(amount)}</span>
            <div className="mt-0.5 h-px w-16 bg-border-strong" />
            <span className="mt-0.5 text-[0.68rem] uppercase tracking-wide text-text-3">pays</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Avatar person={payee} size="lg" />
            <span className="text-[0.72rem] text-text-3">{payee?.id === ME_ID ? "You" : payee?.name.split(" ")[0]}</span>
          </div>
        </div>

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
                  updatePerson(ME_ID, { upiId: upiDraft.trim() });
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
                {youOwe ? "Paying" : "Pay to"}
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
        ) : (
          /* Paying someone with no UPI id on file */
          <div className="rounded-[16px] border border-border bg-surface-2 p-4 text-center">
            <p className="text-sm text-text-2">
              {person.name.split(" ")[0]} hasn&apos;t added a UPI ID yet. Pay them another way, then mark
              it settled below.
            </p>
          </div>
        )}

        {/* One-tap app buttons (Android) */}
        {upiUri && android && (
          <div className="grid grid-cols-2 gap-2">
            {UPI_APPS.map((app) => (
              <a
                key={app.id}
                href={buildAppUri(app.scheme, {
                  vpa: payee!.upiId!,
                  name: payee!.name,
                  amount,
                  note,
                })}
                className="flex items-center justify-center gap-2 rounded-[13px] border border-border bg-surface py-3 text-[0.85rem] font-semibold text-text transition-colors hover:bg-surface-2"
              >
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: app.color }} />
                {app.label}
              </a>
            ))}
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
          {!youOwe && (
            <Button variant="secondary" size="md" className="flex-1" onClick={shareReminder}>
              <Share2 className="h-4 w-4" /> Remind
            </Button>
          )}
        </div>

        {/* Confirm */}
        <div className="sticky bottom-0 -mx-5 border-t border-border bg-surface px-5 pb-1 pt-3">
          <Button variant="primary" size="lg" fullWidth onClick={confirmSettled}>
            <Check className="h-4.5 w-4.5" />
            {youOwe ? `I've paid ${formatINR(amount)}` : `Mark ${formatINR(amount)} received`}
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
