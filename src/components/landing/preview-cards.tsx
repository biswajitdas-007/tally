import { Copy } from "lucide-react";
import { LANDING } from "./palette";

const card = "w-full max-w-[420px] rounded-[28px] bg-surface p-7 shadow-[var(--shadow-lg)] ring-1 ring-border";

/** Illustrative "simplified settle-up" card. Decorative sample data. */
export function SettlePreviewCard() {
  const rows = [
    { initial: "R", bg: LANDING.violet, fg: LANDING.white, text: <>Riya pays <b>You</b></>, amount: "₹2,400" },
    { initial: "K", bg: LANDING.mintStrong, fg: LANDING.white, text: <>Kabir pays <b>You</b></>, amount: "₹720" },
    { initial: "M", bg: LANDING.sun, fg: LANDING.ink, text: <>Meera pays <b>Kabir</b></>, amount: "₹1,150" },
  ];
  return (
    <div aria-hidden className={card}>
      <div className="flex items-baseline justify-between">
        <span className="font-display text-xl font-bold text-brand-on-soft">Simplified settle-up</span>
        <span className="text-sm font-semibold text-text-2">Goa trip</span>
      </div>
      <div className="mt-4 flex flex-col gap-2.5">
        {rows.map((r) => (
          <div key={r.initial} className="flex items-center gap-2.5 rounded-[16px] bg-surface-2 px-3.5 py-3">
            <span
              className="flex size-8 items-center justify-center rounded-full text-sm font-bold"
              style={{ backgroundColor: r.bg, color: r.fg }}
            >
              {r.initial}
            </span>
            <span className="flex-1 text-sm text-text">{r.text}</span>
            <span className="tnum text-[0.95rem] font-bold text-text">{r.amount}</span>
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <span className="rounded-full bg-mint-soft px-3 py-1.5 text-xs font-bold text-mint-on-soft">Fewest transfers</span>
        <span className="rounded-full bg-violet-soft px-3 py-1.5 text-xs font-bold text-violet-on-soft">Equal or exact splits</span>
      </div>
    </div>
  );
}

const QR_CELLS = "1011001011110101101110110010110110".split("").slice(0, 25);

/** Illustrative UPI settle-up card. Decorative sample data. */
export function UpiPreviewCard() {
  return (
    <div aria-hidden className={card}>
      <span className="font-display text-xl font-bold text-violet-on-soft">Pay Riya at</span>
      <div className="mt-4 flex items-center gap-2.5 rounded-[16px] border border-border px-3.5 py-2.5">
        <span className="flex-1 text-[0.95rem] font-bold text-text">riya@demo</span>
        <span className="inline-flex h-9 items-center gap-1.5 rounded-full bg-violet-soft px-3.5 text-[0.8rem] font-bold text-violet-on-soft">
          <Copy className="size-3.5" strokeWidth={1.75} /> Copy
        </span>
      </div>
      <div className="mt-4 flex items-center gap-4">
        <div
          className="grid size-28 shrink-0 grid-cols-5 gap-1.5 rounded-[16px] p-3 dark:ring-1 dark:ring-white/15"
          style={{ backgroundColor: LANDING.ink }}
        >
          {QR_CELLS.map((c, i) => (
            <span
              key={i}
              className="rounded-[3px]"
              style={{ backgroundColor: i === 12 ? LANDING.magenta : c === "1" ? LANDING.white : "transparent" }}
            />
          ))}
        </div>
        <p className="text-sm leading-relaxed text-text-2">Or scan the QR in any UPI app — GPay, PhonePe, Paytm, your bank.</p>
      </div>
      <div className="mt-5 rounded-full bg-brand py-3.5 text-center text-[0.95rem] font-semibold text-on-brand">I&apos;ve paid ₹820</div>
    </div>
  );
}
