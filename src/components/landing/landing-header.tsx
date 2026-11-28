import Link from "next/link";
import { TallyLogo } from "@/components/app/logo";
import { ThemeToggle } from "@/components/app/theme-toggle";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
      <div className="flex items-center gap-2 sm:gap-4">
        <nav aria-label="Landing" className="hidden items-center gap-6 sm:flex">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="rounded-[10px] px-1 py-2 text-[0.95rem] font-semibold text-text-2 transition-colors hover:text-text"
            >
              {l.label}
            </a>
          ))}
        </nav>
        <ThemeToggle className="size-11" />
        <Link href="/signin" className={cn(buttonVariants(), "rounded-full px-5 text-[0.95rem]")}>
          Sign in
        </Link>
      </div>
    </header>
  );
}
