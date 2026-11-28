import { TallyLogo } from "@/components/app/logo";

const LINKS = [
  { href: "#how", label: "How it works" },
  { href: "#upi", label: "UPI settle-up" },
  { href: "#trust", label: "Privacy" },
];

export function LandingHeader() {
  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 pb-4 pt-[max(var(--safe-top),20px)] md:px-6">
      <a href="#top" aria-label="Tally home" className="rounded-[12px]">
        <TallyLogo size={32} />
      </a>
      <nav aria-label="Landing" className="flex items-center gap-1 sm:gap-6">
        {LINKS.map((l) => (
          <a
            key={l.href}
            href={l.href}
            className="hidden rounded-[10px] px-1 py-2 text-[0.95rem] font-semibold text-text-2 transition-colors hover:text-text sm:inline"
          >
            {l.label}
          </a>
        ))}
        <a
          href="#start"
          className="inline-flex h-11 items-center rounded-full bg-brand px-5 text-[0.95rem] font-semibold text-on-brand shadow-[var(--shadow-brand)] transition-colors hover:bg-brand-hover"
        >
          Get started
        </a>
      </nav>
    </header>
  );
}
