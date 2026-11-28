import { LANDING } from "./palette";

const LEDGERS = [
  { name: "Goa trip", dot: LANDING.sky },
  { name: "Flat rent", dot: LANDING.violet },
  { name: "Friday dinners", dot: LANDING.sun },
  { name: "Office chai fund", dot: LANDING.mint },
  { name: "Wedding gift", dot: LANDING.magenta },
  { name: "Netflix & Spotify", dot: LANDING.ink, invertInDark: true },
];

/** The kinds of shared tables people keep in Tally. */
export function LedgerStrip() {
  return (
    <section aria-label="Made for every shared table" className="px-5 py-12">
      <ul className="mx-auto flex max-w-5xl flex-wrap justify-center gap-3">
        {LEDGERS.map((l) => (
          <li
            key={l.name}
            className="flex items-center gap-2.5 rounded-full border border-border bg-surface py-2 pl-2 pr-4 text-sm font-semibold text-text"
          >
            <span
              aria-hidden
              className={`size-7 rounded-full dark:ring-1 dark:ring-white/20 ${"invertInDark" in l ? "dark:!bg-text" : ""}`}
              style={{ backgroundColor: l.dot }}
            />
            {l.name}
          </li>
        ))}
      </ul>
    </section>
  );
}
