"use client";

import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { CameraOff, ScanLine, Check } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { AccountPicker } from "./account-picker";
import { CATEGORY_LIST } from "@/lib/categories";
import { useStore } from "@/store/useStore";
import { useUI } from "@/store/useUI";
import { useToast } from "@/components/ui/toast";
import { parseUpiUri, buildUpiUri } from "@/lib/upi";
import { cn, formatINR } from "@/lib/utils";

interface Payee {
  vpa: string;
  name: string;
}

export function ScanPaySheet() {
  const open = useUI((s) => s.scanOpen);
  const close = useUI((s) => s.closeScan);
  const accounts = useStore((s) => s.accounts);
  const addFinance = useStore((s) => s.addFinance);
  const { toast } = useToast();

  const [payee, setPayee] = useState<Payee | null>(null);
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("shopping");
  const [note, setNote] = useState("");
  const [accountId, setAccountId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef(0);

  // Reset during render when the sheet opens — no flash of stale values.
  const [wasOpen, setWasOpen] = useState(false);
  if (open && !wasOpen) {
    setWasOpen(true);
    setPayee(null);
    setAmount("");
    setCategory("shopping");
    setNote("");
    setError(null);
    setAccountId(accounts[0]?.id ?? null);
  } else if (!open && wasOpen) {
    setWasOpen(false);
  }

  const scanning = open && !payee && !error;

  useEffect(() => {
    if (!scanning) return;
    let cancelled = false;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    function tick() {
      const v = videoRef.current;
      if (cancelled || !v || !ctx || v.readyState < 2) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      // Decode on a downscaled frame — plenty for QR and keeps it smooth.
      const scale = Math.min(1, 640 / Math.max(v.videoWidth, v.videoHeight));
      const w = Math.round(v.videoWidth * scale);
      const h = Math.round(v.videoHeight * scale);
      canvas.width = w;
      canvas.height = h;
      ctx.drawImage(v, 0, 0, w, h);
      const code = jsQR(ctx.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: "dontInvert" });
      if (code?.data) {
        const parsed = parseUpiUri(code.data);
        if (parsed) {
          setPayee({ vpa: parsed.vpa, name: parsed.name });
          if (parsed.amount) setAmount(String(parsed.amount));
          if (parsed.note) setNote(parsed.note);
          return; // stop the loop; teardown stops the camera
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    }

    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error("unsupported");
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const v = videoRef.current;
        if (v) {
          v.srcObject = stream;
          await v.play().catch(() => {});
        }
        tick();
      } catch (e) {
        const name = (e as { name?: string })?.name;
        setError(
          name === "NotAllowedError"
            ? "Camera access is blocked. Allow it in your browser settings, then try again."
            : name === "NotFoundError"
              ? "No camera found on this device."
              : "Couldn't start the camera. Make sure you're on HTTPS and try again.",
        );
      }
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [scanning]);

  const amt = parseFloat(amount) || 0;
  const canPay = Boolean(payee) && amt > 0;
  const upiLink = payee
    ? buildUpiUri({ vpa: payee.vpa, name: payee.name, amount: amt, note: note.trim() || undefined })
    : "#";

  function pay() {
    if (!payee || amt <= 0) return;
    // Log optimistically — UPI apps can't report success back to the web, so
    // the entry is editable/deletable if a payment falls through.
    addFinance({
      type: "expense",
      amount: amt,
      category,
      note: note.trim() || `Paid ${payee.name}`,
      accountId: accountId ?? undefined,
    });
    toast({ message: `Logged ${formatINR(amt)} to ${payee.name} — opening your UPI app` });
    close();
    window.location.href = upiLink;
  }

  return (
    <Sheet
      open={open}
      onClose={close}
      title={payee ? "Confirm & pay" : "Scan & pay"}
      description={payee ? "Review, then pay in your UPI app" : "Point your camera at any UPI QR code"}
    >
      {!payee ? (
        <div className="flex flex-col gap-4 pt-1">
          {error ? (
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-negative-soft text-negative">
                <CameraOff className="h-7 w-7" />
              </div>
              <p className="max-w-[16rem] text-sm text-text-2">{error}</p>
              <Button variant="secondary" size="lg" onClick={() => setError(null)}>
                Try again
              </Button>
            </div>
          ) : (
            <>
              <div className="relative mx-auto aspect-square w-full max-w-[320px] overflow-hidden rounded-[20px] bg-black">
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  autoPlay
                  className="h-full w-full object-cover"
                />
                {/* Reticle */}
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="h-3/5 w-3/5 rounded-[18px] border-2 border-white/80 shadow-[0_0_0_2000px_rgba(0,0,0,0.35)]" />
                </div>
              </div>
              <div className="flex items-center justify-center gap-2 text-[0.82rem] text-text-3">
                <ScanLine className="h-4 w-4" />
                Scanning for a UPI QR…
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-5 pt-1">
          {/* Payee */}
          <div className="flex items-center gap-3 rounded-[16px] bg-surface-inset p-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand text-lg font-bold text-on-brand">
              {payee.name.trim().charAt(0).toUpperCase() || "₹"}
            </div>
            <div className="min-w-0">
              <p className="truncate font-semibold text-text">{payee.name}</p>
              <p className="truncate text-[0.78rem] text-text-3">{payee.vpa}</p>
            </div>
          </div>

          {/* Amount */}
          <div className="flex flex-col items-center rounded-[18px] bg-surface-inset py-5">
            <span className="text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-text-3">Paying</span>
            <div className="mt-1.5 flex items-baseline justify-center gap-1">
              <span className="font-display text-3xl font-semibold text-text-2">₹</span>
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                inputMode="decimal"
                placeholder="0"
                autoFocus
                style={{ width: `${Math.max((amount || "0").length, 1)}ch`, outline: "none", boxShadow: "none" }}
                className="bg-transparent text-left font-display text-[3.25rem] font-bold leading-none tracking-tight tnum text-text outline-none placeholder:text-text-3"
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <p className="mb-2 px-0.5 text-[0.8rem] font-semibold text-text-2">Category</p>
            <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
              {CATEGORY_LIST.map((c) => {
                const Icon = c.icon;
                const active = category === c.key;
                return (
                  <button
                    key={c.key}
                    onClick={() => setCategory(c.key)}
                    className={cn(
                      "flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-[0.82rem] font-medium transition-all",
                      active
                        ? "border-transparent bg-brand-soft text-brand-on-soft"
                        : "border-border bg-surface text-text-2 hover:border-border-strong",
                    )}
                  >
                    <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
                    {c.label.split(" ")[0]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Account */}
          <AccountPicker value={accountId} onChange={setAccountId} label="Paid from" />

          <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note (optional)" rows={2} />

          <div className="sticky bottom-0 -mx-5 flex gap-3 border-t border-border bg-surface px-5 pb-1 pt-3">
            <Button variant="secondary" size="lg" onClick={() => setPayee(null)}>
              Rescan
            </Button>
            <Button variant="primary" size="lg" fullWidth disabled={!canPay} onClick={pay}>
              <Check className="h-4.5 w-4.5" />
              Pay {formatINR(amt)}
            </Button>
          </div>
        </div>
      )}
    </Sheet>
  );
}
