"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import jsQR from "jsqr";
import { CameraOff, ScanLine, Check, RotateCcw, CircleCheck } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { AccountPicker } from "./account-picker";
import { CATEGORY_LIST } from "@/lib/categories";
import { useStore } from "@/store/useStore";
import { useUI } from "@/store/useUI";
import { useToast } from "@/components/ui/toast";
import { parseUpiUri, buildAppUri, buildUpiUri, payUriFromScan, payAppUriFromScan, UPI_APPS } from "@/lib/upi";
import { cn, formatINR, uid } from "@/lib/utils";

interface Payee {
  vpa: string;
  name: string;
  /** Exact scanned QR payload — preserved when paying (keeps merchant fields). */
  raw?: string;
}
type Phase = "scan" | "confirm" | "paying";

export function ScanPaySheet() {
  const open = useUI((s) => s.scanOpen);
  const close = useUI((s) => s.closeScan);
  const accounts = useStore((s) => s.accounts);
  const finance = useStore((s) => s.finance);
  const addFinance = useStore((s) => s.addFinance);
  const deleteFinance = useStore((s) => s.deleteFinance);
  const { toast } = useToast();

  const [phase, setPhase] = useState<Phase>("scan");
  const [payee, setPayee] = useState<Payee | null>(null);
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("shopping");
  const [note, setNote] = useState("");
  const [accountId, setAccountId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paidId, setPaidId] = useState<string | null>(null);
  const [paidApp, setPaidApp] = useState("your UPI app");
  const [returned, setReturned] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef(0);

  // Reset during render when the sheet opens — no flash of stale values.
  const [wasOpen, setWasOpen] = useState(false);
  if (open && !wasOpen) {
    setWasOpen(true);
    setPhase("scan");
    setPayee(null);
    setAmount("");
    setCategory("shopping");
    setNote("");
    setError(null);
    setPaidId(null);
    setReturned(false);
    setAccountId(accounts[0]?.id ?? null);
  } else if (!open && wasOpen) {
    setWasOpen(false);
  }

  // Unique recent payees (finance is newest-first), for one-tap re-pay.
  const recentPayees = useMemo(() => {
    const seen = new Set<string>();
    const out: Payee[] = [];
    for (const f of finance) {
      if (!f.payeeVpa || seen.has(f.payeeVpa)) continue;
      seen.add(f.payeeVpa);
      out.push({ vpa: f.payeeVpa, name: f.payeeName || f.payeeVpa });
      if (out.length >= 4) break;
    }
    return out;
  }, [finance]);

  const scanning = open && phase === "scan" && !error;

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
          setPayee({ vpa: parsed.vpa, name: parsed.name, raw: parsed.raw });
          if (parsed.amount) setAmount(String(parsed.amount));
          if (parsed.note) setNote(parsed.note);
          setPhase("confirm");
          return;
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    }

    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error("unsupported");
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
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

  // We can't force a UPI app to return to a web app, but we can notice when the
  // user switches back and flip the prompt to "welcome back, did it work?".
  useEffect(() => {
    if (!open) return;
    const onVis = () => {
      if (document.visibilityState === "visible") setReturned((r) => r || phase === "paying");
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [open, phase]);

  const amt = parseFloat(amount) || 0;
  const canPay = Boolean(payee) && amt > 0;

  function pickPayee(p: Payee) {
    setPayee(p);
    setPhase("confirm");
  }

  // Log the expense (optimistically) and move to the "did it go through?" step.
  function onPay(appLabel: string) {
    if (!payee || amt <= 0) return;
    const entry = addFinance({
      type: "expense",
      amount: amt,
      category,
      note: note.trim() || `Paid ${payee.name}`,
      accountId: accountId ?? undefined,
      payeeVpa: payee.vpa,
      payeeName: payee.name,
    });
    setPaidId(entry.id);
    setPaidApp(appLabel);
    setReturned(false);
    setPhase("paying");
  }

  function confirmPaid() {
    toast({ message: `Payment to ${payee?.name ?? "payee"} logged` });
    close();
  }

  function undoPaid() {
    if (paidId) deleteFinance(paidId);
    setPaidId(null);
    setPhase("confirm"); // back to the app chooser to try again or cancel
  }

  // A unique transaction ref per payee, injected only into merchant QRs that
  // lack one (NPCI mandates a unique `tr` for P2M).
  const txnRef = useMemo(() => uid("TLY").toUpperCase(), [payee]);

  /**
   * Prefer the preserved raw QR payload (keeps mc/tr/sign → avoids the bogus
   * "limit exceeded"); fall back to a plain P2P link for a recent-payee re-pay.
   */
  function linkFor(app?: { scheme: string }): string {
    if (!payee) return "#";
    if (payee.raw) return app ? payAppUriFromScan(app, payee.raw, amt, txnRef) : payUriFromScan(payee.raw, amt, txnRef);
    const params = { vpa: payee.vpa, name: payee.name, amount: amt, note: note.trim() || undefined };
    return app ? buildAppUri(app, params) : buildUpiUri(params);
  }

  const title = phase === "scan" ? "Scan & pay" : phase === "paying" ? "Payment sent?" : "Confirm & pay";
  const description =
    phase === "scan"
      ? "Point your camera at any UPI QR code"
      : phase === "paying"
        ? undefined
        : "Review, pick your UPI app, then pay";

  return (
    <Sheet open={open} onClose={close} title={title} description={description}>
      {phase === "scan" && (
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
                <video ref={videoRef} playsInline muted autoPlay className="h-full w-full object-cover" />
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="h-3/5 w-3/5 rounded-[18px] border-2 border-white/80 shadow-[0_0_0_2000px_rgba(0,0,0,0.35)]" />
                </div>
              </div>
              <div className="flex items-center justify-center gap-2 text-[0.82rem] text-text-3">
                <ScanLine className="h-4 w-4" />
                Scanning for a UPI QR…
              </div>

              {recentPayees.length > 0 && (
                <div>
                  <p className="mb-2 px-0.5 text-[0.8rem] font-semibold text-text-2">Recent payees</p>
                  <div className="flex flex-col gap-1.5">
                    {recentPayees.map((p) => (
                      <button
                        key={p.vpa}
                        onClick={() => pickPayee(p)}
                        className="flex items-center gap-3 rounded-[13px] border border-border bg-surface px-3 py-2.5 text-left transition-colors hover:border-border-strong hover:bg-surface-2"
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-sm font-bold text-brand-on-soft">
                          {p.name.trim().charAt(0).toUpperCase() || "₹"}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-[0.9rem] font-medium text-text">{p.name}</span>
                          <span className="block truncate text-[0.74rem] text-text-3">{p.vpa}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {phase === "confirm" && payee && (
        <div className="flex flex-col gap-5 pt-1">
          <div className="flex items-center gap-3 rounded-[16px] bg-surface-inset p-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand text-lg font-bold text-on-brand">
              {payee.name.trim().charAt(0).toUpperCase() || "₹"}
            </div>
            <div className="min-w-0">
              <p className="truncate font-semibold text-text">{payee.name}</p>
              <p className="truncate text-[0.78rem] text-text-3">{payee.vpa}</p>
            </div>
          </div>

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

          <AccountPicker value={accountId} onChange={setAccountId} label="Paid from" />
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note (optional)" rows={2} />

          {/* UPI app chooser — opens the exact app so nothing hijacks the intent */}
          <div>
            <p className="mb-2 px-0.5 text-[0.8rem] font-semibold text-text-2">Pay with</p>
            {canPay ? (
              <>
                <div className="grid grid-cols-2 gap-2">
                  {UPI_APPS.map((app) => (
                    <a
                      key={app.id}
                      href={linkFor(app)}
                      onClick={() => onPay(app.label)}
                      className="flex items-center justify-center gap-2 rounded-[13px] border border-border bg-surface py-3.5 text-[0.9rem] font-semibold text-text transition-all hover:border-border-strong hover:bg-surface-2 active:scale-[0.98]"
                    >
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: app.color }} />
                      {app.label}
                    </a>
                  ))}
                </div>
                <a
                  href={linkFor()}
                  onClick={() => onPay("your UPI app")}
                  className="mt-2 block text-center text-[0.8rem] font-semibold text-brand"
                >
                  Other UPI app
                </a>
              </>
            ) : (
              <p className="rounded-[13px] border border-dashed border-border px-3 py-3 text-center text-[0.82rem] text-text-3">
                Enter an amount above to choose a UPI app.
              </p>
            )}
          </div>

          <button
            onClick={() => {
              setPayee(null);
              setPhase("scan");
            }}
            className="text-center text-[0.82rem] font-medium text-text-3 hover:text-text-2"
          >
            ← Scan a different code
          </button>
        </div>
      )}

      {phase === "paying" && payee && (
        <div className="flex flex-col gap-5 pt-2">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-soft text-brand">
              <CircleCheck className="h-8 w-8" />
            </div>
            <div>
              <p className="font-display text-lg font-semibold text-text">
                {formatINR(amt)} to {payee.name}
              </p>
              <p className="mt-1 text-sm text-text-2">
                {returned
                  ? "Welcome back! Did the payment go through?"
                  : `We opened ${paidApp} and saved this to your money log. Finish paying there, then come back to confirm.`}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2.5">
            <Button variant="primary" size="lg" fullWidth onClick={confirmPaid}>
              <Check className="h-4.5 w-4.5" /> Yes, it&apos;s paid
            </Button>
            <Button variant="secondary" size="lg" fullWidth onClick={undoPaid}>
              <RotateCcw className="h-4 w-4" /> Not paid — remove it
            </Button>
          </div>
          <p className="px-2 text-center text-[0.74rem] text-text-3">
            &ldquo;Not paid&rdquo; removes the entry from your log so nothing is double-counted.
          </p>
        </div>
      )}
    </Sheet>
  );
}
