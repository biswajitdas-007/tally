"use client";

import Link from "next/link";
import { User, Users, type LucideIcon } from "lucide-react";
import { SignedAmount } from "@/components/ui/signed-amount";
import { cn } from "@/lib/utils";
import type { SplitSide } from "@/lib/balances";

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

function amountTone(square: boolean, net: number): string {
  if (square) return "text-text-3";
  return net > 0 ? "text-positive" : "text-negative";
}

function Side({
  href,
  icon: Icon,
  tint,
  label,
  sub,
  side,
}: Readonly<{ href: string; icon: LucideIcon; tint: string; label: string; sub: string; side: SplitSide }>) {
  const square = Math.abs(side.net) < 0.5;
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-surface-2 active:bg-surface-inset"
    >
      <span aria-hidden className={cn("flex size-[42px] shrink-0 items-center justify-center rounded-[14px]", tint)}>
        <Icon className="size-5" strokeWidth={1.7} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[0.9375rem] font-bold text-text">{label}</span>
        <span className="block truncate text-[0.8125rem] text-text-2">{sub}</span>
      </span>
      <span className={cn("shrink-0 text-[0.9375rem] font-semibold tnum", amountTone(square, side.net))}>
        {square ? "Settled" : <SignedAmount net={side.net} />}
      </span>
    </Link>
  );
}

/**
 * The two kinds of splitting, side by side: what's outstanding one-on-one and
 * what's outstanding inside groups. Each settles separately, so they're worth
 * seeing apart rather than rolled into a single figure.
 */
export function SplitOverviewCard({ direct, group }: Readonly<{ direct: SplitSide; group: SplitSide }>) {
  return (
    <section
      aria-label="Your splits"
      className="divide-y-[1.5px] divide-border overflow-hidden rounded-[24px] border-[1.5px] border-border bg-surface"
    >
      <Side
        href="/direct"
        icon={User}
        tint="bg-brand-soft text-brand-on-soft"
        label="Personal splits"
        sub={direct.people > 0 ? plural(direct.people, "person", "people") : "Nothing one-on-one yet"}
        side={direct}
      />
      <Side
        href="/groups"
        icon={Users}
        tint="bg-sky-soft text-sky-on-soft"
        label="Group splits"
        sub={group.groups > 0 ? plural(group.groups, "group", "groups") : "No group expenses yet"}
        side={group}
      />
    </section>
  );
}
