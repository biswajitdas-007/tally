"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { BOTTOM_NAV } from "./nav-items";
import { useUI } from "@/store/useUI";

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function BottomNav() {
  const pathname = usePathname();
  const openAdd = useUI((s) => s.openAdd);
  const left = BOTTOM_NAV.slice(0, 2);
  const right = BOTTOM_NAV.slice(2);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 md:hidden">
      <div className="glass border-t border-border pb-[max(env(safe-area-inset-bottom),8px)]">
        <div className="relative mx-auto flex h-16 max-w-md items-center justify-around px-2">
          {left.map((item) => (
            <NavButton key={item.href} item={item} active={isActive(pathname, item.href)} />
          ))}

          <div className="flex w-16 shrink-0 justify-center">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => openAdd()}
              aria-label="Add expense"
              className="-mt-8 flex h-15 w-15 items-center justify-center rounded-full bg-brand text-on-brand shadow-[var(--shadow-brand)] ring-[5px] ring-[var(--bg)]"
              style={{ height: 58, width: 58 }}
            >
              <Plus className="h-6 w-6" strokeWidth={2.4} />
            </motion.button>
          </div>

          {right.map((item) => (
            <NavButton key={item.href} item={item} active={isActive(pathname, item.href)} />
          ))}
        </div>
      </div>
    </nav>
  );
}

function NavButton({
  item,
  active,
}: {
  item: { href: string; label: string; icon: React.ComponentType<{ className?: string; strokeWidth?: number }> };
  active: boolean;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className="relative flex flex-1 flex-col items-center gap-0.5 py-1.5"
      aria-current={active ? "page" : undefined}
    >
      <span className="relative flex h-8 w-12 items-center justify-center">
        {active && (
          <motion.span
            layoutId="bottom-nav-active"
            className="absolute inset-0 rounded-full bg-brand-soft"
            transition={{ type: "spring", stiffness: 420, damping: 34 }}
          />
        )}
        <Icon
          className={cn("relative h-[21px] w-[21px]", active ? "text-brand" : "text-text-3")}
          strokeWidth={active ? 2.4 : 2}
        />
      </span>
      <span className={cn("text-[0.62rem] font-semibold", active ? "text-brand" : "text-text-3")}>
        {item.label}
      </span>
    </Link>
  );
}
