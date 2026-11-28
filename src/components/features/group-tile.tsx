"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { useGroupSummary } from "@/hooks/use-group-summary";
import { Button } from "@/components/ui/button";
import { formatINR, cn } from "@/lib/utils";
import { groupFill } from "@/lib/group-colour";
import type { Group } from "@/lib/types";

const TILE = "flex h-[168px] w-[150px] shrink-0 snap-start flex-col rounded-[24px] p-4";

function balanceTone(settled: boolean, net: number): string {
  if (settled) return "text-text-2";
  return net > 0 ? "text-positive" : "text-negative";
}

function balanceLabel(net: number): string {
  return net > 0 ? "You're owed" : "You owe";
}

/**
 * A group as a coloured tile for the Home rail. The fill is the group's colour
 * (see groupFill), so --on-tile text keeps AA contrast in both themes.
 */
export function GroupTile({ group }: Readonly<{ group: Group }>) {
  const { members, net, settled } = useGroupSummary(group);

  return (
    <Link
      href={`/groups/${group.id}`}
      className={cn(TILE, "gap-1 text-on-tile transition-transform hover:-translate-y-0.5")}
      style={{ background: groupFill(group.color) }}
    >
      <span
        aria-hidden
        className="flex size-9 items-center justify-center rounded-[12px] bg-[color-mix(in_srgb,var(--on-tile)_16%,transparent)] text-xl"
      >
        {group.icon}
      </span>
      <span className="mt-auto truncate text-[1.0625rem] font-semibold">{group.name}</span>
      <span className="text-xs font-semibold">
        {members.length} {members.length === 1 ? "member" : "members"}
      </span>
      <span
        className={cn(
          "mt-1.5 self-start rounded-full bg-surface px-2.5 py-1 text-xs font-semibold tnum",
          balanceTone(settled, net),
        )}
      >
        {settled ? (
          "all settled"
        ) : (
          <>
            <span className="sr-only">{balanceLabel(net)}: </span>
            {formatINR(net, { decimals: false, signed: true })}
          </>
        )}
      </span>
    </Link>
  );
}

/** The dashed "New group" tile that ends the rail. */
export function NewGroupTile({ onClick }: Readonly<{ onClick: () => void }>) {
  return (
    <Button
      variant="outline"
      onClick={onClick}
      className={cn(
        TILE,
        "h-[168px] items-center justify-center gap-2 border-[1.5px] border-dashed border-border-strong bg-transparent text-text-2 shadow-none",
      )}
    >
      <Plus className="size-6" strokeWidth={1.8} aria-hidden />
      New group
    </Button>
  );
}
