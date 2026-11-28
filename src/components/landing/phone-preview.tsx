import { House, Mountain, Utensils } from "lucide-react";
import { LANDING } from "./palette";

/** A static, illustrative phone screen for the hero. Purely decorative. */
export function PhonePreview() {
  return (
    <div
      aria-hidden
      className="relative mx-auto w-[280px] rotate-[4deg] rounded-[46px] p-2.5 shadow-[var(--shadow-lg)] dark:ring-1 dark:ring-white/15"
      style={{ backgroundColor: LANDING.ink }}
    >
      <div className="flex h-[540px] flex-col gap-3.5 overflow-hidden rounded-[37px] bg-surface px-[18px] py-6 text-text">
        <p className="text-[0.8rem] font-medium text-text-2">Good evening, Aarav</p>
        <div className="rounded-[22px] p-4 text-white dark:ring-1 dark:ring-white/15" style={{ backgroundColor: LANDING.ink }}>
          <p className="text-[0.75rem] font-medium" style={{ color: LANDING.inkMuted }}>
            You are owed overall
          </p>
          <p className="tnum mt-0.5 font-display text-[1.9rem] font-bold">₹4,280</p>
          <div className="mt-2 flex gap-2 text-[0.68rem] font-semibold">
            <span className="rounded-full px-2 py-1" style={{ backgroundColor: LANDING.mintStrong }}>
              +₹5,100
            </span>
            <span className="rounded-full px-2 py-1" style={{ backgroundColor: LANDING.magentaStrong }}>
              −₹820
            </span>
          </div>
        </div>
        <p className="text-sm font-bold">Your ledgers</p>
        {[
          { icon: Mountain, name: "Goa trip", meta: "4 members", amount: "+₹3,120", tone: "text-positive", tint: "bg-sky-soft text-sky-on-soft" },
          { icon: House, name: "Flat 4B", meta: "3 members", amount: "−₹820", tone: "text-negative", tint: "bg-violet-soft text-violet-on-soft" },
          { icon: Utensils, name: "Friday dinners", meta: "6 members", amount: "settled", tone: "text-text-2", tint: "bg-sun-soft text-sun-on-soft" },
        ].map((row) => (
          <div key={row.name} className="flex items-center gap-2.5 rounded-[18px] border border-border p-3">
            <span className={`flex size-9 items-center justify-center rounded-[12px] ${row.tint}`}>
              <row.icon className="size-[18px]" strokeWidth={1.75} />
            </span>
            <span className="flex-1">
              <span className="block text-[0.8rem] font-bold">{row.name}</span>
              <span className="block text-[0.68rem] text-text-2">{row.meta}</span>
            </span>
            <span className={`tnum text-[0.75rem] font-bold ${row.tone}`}>{row.amount}</span>
          </div>
        ))}
        <div className="mt-auto rounded-full bg-brand py-3 text-center text-[0.8rem] font-semibold text-on-brand">
          Settle up with Riya · ₹820
        </div>
      </div>
    </div>
  );
}
