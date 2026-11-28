import { TallyLogo } from "@/components/app/logo";
import { REPO_URL as REPO } from "@/lib/version";

const LINKS = [
  { href: "#trust", label: "Privacy" },
  { href: `${REPO}/blob/main/SECURITY.md`, label: "Security", external: true },
  { href: REPO, label: "GitHub", external: true },
  { href: `${REPO}/issues/new/choose`, label: "Report a bug", external: true },
];

export function LandingFooter() {
  return (
    <footer className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 pb-[max(var(--safe-bottom),32px)] pt-8 md:px-6">
      <div className="flex items-center gap-3">
        <TallyLogo size={26} />
        <span className="text-sm text-text-2">Split expenses, settle over UPI</span>
      </div>
      <nav aria-label="Footer" className="flex flex-wrap gap-6">
        {LINKS.map((l) => (
          <a
            key={l.label}
            href={l.href}
            {...(l.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            className="rounded-[8px] py-2 text-sm font-semibold text-text-2 hover:text-text"
          >
            {l.label}
          </a>
        ))}
      </nav>
    </footer>
  );
}
