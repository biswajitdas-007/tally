"use client";

import Link from "next/link";
import { ArrowLeftRight, Users, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { formatINR, cn } from "@/lib/utils";
import type { SplitSide } from "@/lib/balances";

function Side({
  href,
  icon: Icon,
  label,
  sub,
  side,
}: {
  href: string;
  icon: typeof Users;
  label: string;
  sub: string;
  side: SplitSide;
}) {
  const square = Math.abs(side.net) < 0.5;
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-surface-2 active:bg-surface-inset"
    >
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
          square ? "bg-surface-inset text-text-3" : side.net > 0 ? "bg-positive-soft text-positive" : "bg-negative-soft text-negative",
        )}
      >
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[0.9rem] font-medium text-text">{label}</p>
        <p className="truncate text-[0.76rem] text-text-3">{square ? sub : side.net > 0 ? "owed to you" : "you owe"}</p>
      </div>
      <span
        className={cn(
          "shrink-0 tnum text-[0.95rem] font-semibold",
          square ? "text-text-3" : side.net > 0 ? "text-positive" : "text-negative",
        )}
      >
        {square ? "Settled" : formatINR(Math.abs(side.net))}
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-text-3" />
    </Link>
  );
}

/**
 * The two kinds of splitting, side by side: what's outstanding one-on-one and
 * what's outstanding inside groups. Each settles separately, so they're worth
 * seeing apart rather than rolled into a single figure.
 */
export function SplitOverviewCard({ direct, group }: { direct: SplitSide; group: SplitSide }) {
  return (
    <Card className="overflow-hidden">
      <div className="divide-y divide-border">
        <Side
          href="/direct"
          icon={ArrowLeftRight}
          label="Personal splits"
          sub={direct.people > 0 ? `${direct.people} ${direct.people === 1 ? "person" : "people"}` : "Nothing one-on-one yet"}
          side={direct}
        />
        <Side
          href="/groups"
          icon={Users}
          label="Group splits"
          sub={group.groups > 0 ? `${group.groups} ${group.groups === 1 ? "group" : "groups"}` : "No group expenses yet"}
          side={group}
        />
      </div>
    </Card>
  );
}
