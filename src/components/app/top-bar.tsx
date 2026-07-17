"use client";

import Link from "next/link";
import { Bell, Menu } from "lucide-react";
import { TallyMark } from "./logo";
import { Avatar } from "@/components/ui/avatar";
import { useMe } from "@/store/useStore";
import { useUI } from "@/store/useUI";

export function TopBar() {
  const me = useMe();
  const openMenu = useUI((s) => s.openMenu);

  return (
    <header className="glass sticky top-0 z-30 border-b border-border pt-[env(safe-area-inset-top)] md:hidden">
      <div className="flex h-14 items-center gap-1 px-2.5">
        <button
          onClick={openMenu}
          aria-label="Open menu"
          className="flex h-10 w-10 items-center justify-center rounded-full text-text-2 transition-colors hover:bg-surface-inset hover:text-text active:scale-90"
        >
          <Menu className="h-[21px] w-[21px]" />
        </button>
        <Link href="/" className="flex items-center gap-2">
          <TallyMark size={26} />
          <span className="font-display text-lg font-bold tracking-[-0.03em]">Tally</span>
        </Link>
        <div className="ml-auto flex items-center gap-0.5">
          <Link
            href="/activity"
            aria-label="Activity"
            className="relative flex h-9 w-9 items-center justify-center rounded-full text-text-2 transition-colors hover:bg-surface-inset hover:text-text"
          >
            <Bell className="h-[18px] w-[18px]" />
          </Link>
          <Link href="/account" aria-label="Account" className="ml-1">
            <Avatar person={me} size="sm" />
          </Link>
        </div>
      </div>
    </header>
  );
}
