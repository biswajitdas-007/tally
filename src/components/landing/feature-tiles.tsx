import { BarChart3, Bell, Repeat, Users, WifiOff, Zap, type LucideIcon } from "lucide-react";
import { LANDING } from "./palette";
import { SectionHeading } from "./section-heading";

// Fixed brand fills (the same in both themes). Every text colour here keeps
// WCAG AA (≥ 4.5:1) on its fill.
const TILES: { icon: LucideIcon; title: string; body: string; bg: string; fg: string; muted: string }[] = [
  { icon: Users, title: "Groups & 1-on-1", body: "Ledgers for trips and flats, or direct splits with one friend.", bg: LANDING.magenta, fg: LANDING.white, muted: LANDING.white },
  { icon: Repeat, title: "Repeating expenses", body: "Rent and subscriptions add themselves every week or month.", bg: LANDING.violet, fg: LANDING.white, muted: LANDING.onViolet },
  { icon: Zap, title: "Realtime sync", body: "Everyone in the group sees new expenses the moment they're added.", bg: LANDING.skyStrong, fg: LANDING.white, muted: LANDING.white },
  { icon: Bell, title: "Gentle reminders", body: "Receipts by email, a monthly nudge and web push — no awkward texts.", bg: LANDING.sun, fg: LANDING.ink, muted: LANDING.onSun },
  { icon: BarChart3, title: "Insights", body: "Your share by month, category and group.", bg: LANDING.mintStrong, fg: LANDING.white, muted: LANDING.onMint },
  { icon: WifiOff, title: "Works offline", body: "Install it like an app. Changes sync when you're back online.", bg: LANDING.ink, fg: LANDING.white, muted: LANDING.inkMuted },
];

export function FeatureTiles() {
  return (
    <section id="features" className="bg-surface-2 py-20">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-5 md:px-6">
        <SectionHeading className="max-w-[40rem] text-text">
          Everything a shared table <span className="font-accent text-brand">needs.</span>
        </SectionHeading>
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {TILES.map(({ icon: Icon, title, body, bg, fg, muted }) => (
            <li
              key={title}
              className="flex min-h-[200px] flex-col gap-2.5 rounded-[28px] p-7 dark:ring-1 dark:ring-white/10"
              style={{ backgroundColor: bg, color: fg }}
            >
              <Icon aria-hidden className="size-8" strokeWidth={1.75} />
              <h3 className="mt-auto text-[1.35rem] font-bold">{title}</h3>
              <p className="leading-relaxed" style={{ color: muted }}>
                {body}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
