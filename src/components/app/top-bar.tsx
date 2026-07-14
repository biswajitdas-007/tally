"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { TallyMark } from "./logo";
import { ThemeToggle } from "./theme-toggle";
import { Avatar } from "@/components/ui/avatar";
import { useMe, useStore } from "@/store/useStore";

export function TopBar() {
  const me = useMe();
  const pendingInvites = useStore((s) => s.invites.filter((i) => i.status === "pending").length);

  return (
    <header className="glass sticky top-0 z-30 border-b border-border pt-[env(safe-area-inset-top)] md:hidden">
      <div className="flex h-14 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <TallyMark size={28} />
          <span className="font-display text-lg font-bold tracking-[-0.03em]">Tally</span>
        </Link>
        <div className="flex items-center gap-0.5">
          <ThemeToggle />
          <Link
            href="/activity"
            aria-label="Activity"
            className="relative flex h-9 w-9 items-center justify-center rounded-full text-text-2 transition-colors hover:bg-surface-inset hover:text-text"
          >
            <Bell className="h-[18px] w-[18px]" />
            {pendingInvites > 0 && (
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-negative ring-2 ring-[var(--surface)]" />
            )}
          </Link>
          <Link href="/account" aria-label="Account" className="ml-1">
            <Avatar person={me} size="sm" />
          </Link>
        </div>
      </div>
    </header>
  );
}
