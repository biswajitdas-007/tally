import { Coffee, Gift, House, MonitorPlay, TreePalm, UtensilsCrossed, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Each tone is a soft fill with its darker "on-soft" ink: theme tokens that
 * keep the icon well above 3:1 in both light and dark.
 */
const LEDGERS: { name: string; icon: LucideIcon; tone: string }[] = [
  { name: "Goa trip", icon: TreePalm, tone: "bg-sky-soft text-sky-on-soft" },
  { name: "Flat rent", icon: House, tone: "bg-violet-soft text-violet-on-soft" },
  { name: "Friday dinners", icon: UtensilsCrossed, tone: "bg-sun-soft text-sun-on-soft" },
  { name: "Office chai fund", icon: Coffee, tone: "bg-mint-soft text-mint-on-soft" },
  { name: "Wedding gift", icon: Gift, tone: "bg-brand-soft text-brand-on-soft" },
  { name: "Netflix & Spotify", icon: MonitorPlay, tone: "bg-[color-mix(in_srgb,var(--text)_10%,transparent)] text-text" },
];

/** The kinds of shared tables people keep in Tally. */
export function LedgerStrip() {
  return (
    <section aria-label="Made for every shared table" className="px-5 py-12">
      <ul className="mx-auto flex max-w-5xl flex-wrap justify-center gap-3">
        {LEDGERS.map(({ name, icon: Icon, tone }) => (
          <li
            key={name}
            className="flex items-center gap-2.5 rounded-full border border-border bg-surface py-1.5 pr-4 pl-1.5 text-sm font-semibold text-text"
          >
            <span aria-hidden className={cn("flex size-8 items-center justify-center rounded-full", tone)}>
              <Icon className="size-4" strokeWidth={1.8} />
            </span>
            {name}
          </li>
        ))}
      </ul>
    </section>
  );
}
