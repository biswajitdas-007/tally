"use client";

import { useId, useState } from "react";
import { Copy, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useStore } from "@/store/useStore";
import { isValidVpa } from "@/lib/upi";
import { UpiQr } from "./upi-qr";

/** A filename-safe slug of the payee's name; names in other scripts fall back to "payee". */
const fileLabel = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, "") || "payee";

const HINT = "text-[0.8125rem] leading-normal text-text-2";

/** The payee's UPI ID to copy, plus an optional QR carrying the ID and the amount. */
function PayeeUpi({
  upi,
  youPay,
  name,
  payUri,
  payeeName,
  amount,
}: Readonly<{ upi: string; youPay: boolean; name: string; payUri: string | null; payeeName: string; amount: number }>) {
  const { toast } = useToast();
  const [showQr, setShowQr] = useState(false);
  const qrId = useId();

  function copy() {
    navigator.clipboard
      .writeText(upi)
      .then(() => toast({ message: "UPI ID copied" }))
      .catch(() => toast({ message: "Couldn't copy — select the ID instead", tone: "info" }));
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="px-0.5 text-[0.8125rem] font-semibold text-text-2">{youPay ? `Pay ${name} at` : "Your UPI ID"}</p>
      <div className="flex items-center gap-2.5 rounded-[18px] bg-surface-2 py-2 pr-2 pl-4">
        <span className="min-w-0 flex-1 truncate text-base font-extrabold text-text select-all">{upi}</span>
        <Button variant="ink" size="sm" onClick={copy} className="h-10 rounded-full px-4">
          <Copy className="size-3.5" strokeWidth={2.2} aria-hidden /> Copy
        </Button>
      </div>
      <p className={HINT}>
        {youPay
          ? "Copy their UPI ID, pay in any UPI app, then mark it paid below."
          : `Share this so ${name} can pay you, then mark it received.`}
      </p>

      {/* A QR carries the ID and the amount together, so neither gets retyped.
          Tally still doesn't move the money — the payer's own UPI app does. */}
      {payUri && (
        <>
          {showQr && (
            <div id={qrId} className="mt-1 flex flex-col gap-3 rounded-[20px] border-[1.5px] border-border p-3">
              <UpiQr uri={payUri} amount={amount} payeeName={payeeName} fileLabel={fileLabel(payeeName)} />
              <p className={HINT}>
                {youPay
                  ? "Save it, then open your UPI app, tap Scan and pick it from your gallery. Their ID and the amount are already in it."
                  : `Let ${name} scan this — the amount is already filled in. Or share the image so they can scan it from their gallery.`}
              </p>
            </div>
          )}
          <Button
            variant="ghost"
            aria-expanded={showQr}
            aria-controls={showQr ? qrId : undefined}
            onClick={() => setShowQr((v) => !v)}
            className="-ml-3 self-start font-extrabold text-violet-on-soft hover:text-violet-on-soft"
          >
            <QrCode className="size-[18px]" strokeWidth={1.7} aria-hidden />
            {showQr ? "Hide QR" : qrLabel(youPay)}
          </Button>
        </>
      )}
    </div>
  );
}

const qrLabel = (youPay: boolean) => (youPay ? "Pay by QR instead" : "Show a QR to get paid");

/** They owe you, but you haven't told Tally where to be paid. */
function OwnUpiForm({ name }: Readonly<{ name: string }>) {
  const updateProfile = useStore((s) => s.updateProfile);
  const { toast } = useToast();
  const [draft, setDraft] = useState("");
  const inputId = useId();
  const valid = isValidVpa(draft);

  function save(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!valid) return;
    updateProfile({ upiId: draft.trim() });
    toast({ message: "UPI ID saved" });
  }

  return (
    <form onSubmit={save} className="rounded-[18px] bg-surface-2 p-4">
      <Field label="Add your UPI ID" htmlFor={inputId} hint={`So ${name} can pay you directly.`}>
        <div className="flex gap-2">
          <Input
            id={inputId}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="yourname@okhdfcbank"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            className="h-11 rounded-[14px] bg-surface"
          />
          <Button type="submit" disabled={!valid} className="h-11">
            Save
          </Button>
        </div>
      </Field>
    </form>
  );
}

/**
 * How the money moves. Tally doesn't move it: it shows the payee's UPI ID (or
 * asks for yours), you pay in any UPI app, and the button records it.
 */
export function SettlePayment({
  youPay,
  settled,
  name,
  payeeUpi,
  payUri,
  payeeName,
  amount,
}: Readonly<{
  youPay: boolean;
  settled: boolean;
  /** The other person's first name. */
  name: string;
  payeeUpi: string | null;
  payUri: string | null;
  payeeName: string;
  amount: number;
}>) {
  if (settled) return null;
  if (payeeUpi) {
    return <PayeeUpi upi={payeeUpi} youPay={youPay} name={name} payUri={payUri} payeeName={payeeName} amount={amount} />;
  }
  if (!youPay) return <OwnUpiForm name={name} />;
  return (
    <p className={`rounded-[18px] bg-surface-2 p-4 ${HINT}`}>
      {name} hasn&apos;t added a UPI ID yet. Pay them however you like, then mark it settled below.
    </p>
  );
}
