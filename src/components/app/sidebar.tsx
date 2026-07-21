"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "./nav-items";
import { TallyMark } from "./logo";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { ThemeToggle } from "./theme-toggle";
import { useUI } from "@/store/useUI";
import { useMe } from "@/store/useStore";
import { usePendingNav } from "@/hooks/use-pending-nav";

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function Sidebar() {
  const pathname = usePathname();
  const [pending, setPending] = usePendingNav();
  const openAdd = useUI((s) => s.openAdd);
  const me = useMe();

  return (
    <aside className="sticky top-0 hidden h-dvh w-[248px] shrink-0 flex-col border-r border-border bg-surface/60 px-3.5 py-5 md:flex">
      <Link href="/" className="mb-7 flex items-center gap-2.5 px-2">
        <TallyMark size={34} />
        <span className="font-display text-lg font-bold tracking-[-0.03em]">Tally</span>
      </Link>

      <Button size="lg" fullWidth className="mb-5 justify-start gap-2.5 px-3.5" onClick={() => openAdd()}>
        <Plus className="h-[18px] w-[18px]" />
        New expense
      </Button>

      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pending === href || (!pending && isActive(pathname, href));
          return (
            <Link
              key={href}
              href={href}
              prefetch
              onClick={() => setPending(href)}
              className={cn(
                "group flex items-center gap-3 rounded-[13px] px-3 py-2.5 text-[0.92rem] font-medium transition-all active:scale-[0.98]",
                active
                  ? "bg-brand-soft text-brand-on-soft"
                  : "text-text-2 hover:bg-surface-inset hover:text-text",
              )}
            >
              <Icon className={cn("h-[19px] w-[19px]", active ? "text-brand" : "text-text-3 group-hover:text-text-2")} strokeWidth={2} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex items-center gap-2.5 rounded-[14px] border border-border bg-surface p-2.5">
        <Link href="/account" className="flex min-w-0 flex-1 items-center gap-2.5">
          <Avatar person={me} size="sm" />
          <div className="min-w-0">
            <p className="truncate text-[0.82rem] font-semibold text-text">{me?.name ?? "You"}</p>
            <p className="truncate text-[0.72rem] text-text-3">{me?.email ?? "Signed in"}</p>
          </div>
        </Link>
        <ThemeToggle />
      </div>
    </aside>
  );
}
