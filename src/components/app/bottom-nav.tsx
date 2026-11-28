"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { BOTTOM_NAV } from "./nav-items";
import { useUI } from "@/store/useUI";
import { usePendingNav } from "@/hooks/use-pending-nav";

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function BottomNav() {
  const pathname = usePathname();
  const [pending, setPending] = usePendingNav();
  const openAdd = useUI((s) => s.openAdd);
  const left = BOTTOM_NAV.slice(0, 2);
  const right = BOTTOM_NAV.slice(2);

  const activeHref = (href: string) => pending === href || (!pending && isActive(pathname, href));

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 md:hidden">
      <div className="glass border-t border-border pb-[max(var(--safe-bottom),8px)]">
        <div className="relative mx-auto flex h-16 max-w-md items-center justify-around px-2">
          {left.map((item) => (
            <NavButton key={item.href} item={item} active={activeHref(item.href)} onTap={() => setPending(item.href)} />
          ))}

          <div className="flex w-16 shrink-0 justify-center">
            <Button
              size="icon"
              onClick={() => openAdd()}
              aria-label="Add expense"
              className="-mt-8 size-[60px] rounded-[22px] ring-[5px] ring-[var(--bg)] active:scale-90"
            >
              <Plus className="size-[26px]" strokeWidth={2.2} aria-hidden />
            </Button>
          </div>

          {right.map((item) => (
            <NavButton key={item.href} item={item} active={activeHref(item.href)} onTap={() => setPending(item.href)} />
          ))}
        </div>
      </div>
    </nav>
  );
}

function NavButton({
  item,
  active,
  onTap,
}: {
  item: { href: string; label: string; icon: React.ComponentType<{ className?: string; strokeWidth?: number }> };
  active: boolean;
  onTap: () => void;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onTap}
      prefetch
      className="relative flex flex-1 flex-col items-center gap-0.5 py-1.5 transition-transform active:scale-90"
      aria-current={active ? "page" : undefined}
    >
      <span className="relative flex h-8 w-12 items-center justify-center">
        {active && (
          <motion.span
            layoutId="bottom-nav-active"
            className="absolute inset-0 rounded-full bg-brand-soft"
            transition={{ type: "spring", stiffness: 500, damping: 34 }}
          />
        )}
        <Icon
          className={cn("relative h-[21px] w-[21px] transition-colors", active ? "text-brand-on-soft" : "text-text-3")}
          strokeWidth={active ? 1.9 : 1.7}
        />
      </span>
      <span className={cn("text-[0.6875rem] font-semibold transition-colors", active ? "text-brand-on-soft" : "text-text-3")}>
        {item.label}
      </span>
    </Link>
  );
}
