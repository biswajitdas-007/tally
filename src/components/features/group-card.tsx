"use client";

import Link from "next/link";
import { useGroupSummary } from "@/hooks/use-group-summary";
import { AvatarStack } from "@/components/ui/avatar";
import { NetFigure } from "@/components/features/net-figure";
import { groupFill } from "@/lib/group-colour";
import type { Group } from "@/lib/types";

/** A group as a row in the Ledgers list: colour tile, name, members and your balance. */
export function GroupCard({ group }: Readonly<{ group: Group }>) {
  const { members, net, settled } = useGroupSummary(group);

  return (
    <Link
      href={`/groups/${group.id}`}
      className="flex items-center gap-3.5 rounded-[22px] border-[1.5px] border-border bg-surface p-3.5 transition-colors hover:border-border-strong hover:bg-surface-2"
    >
      <span
        aria-hidden
        className="flex size-[50px] shrink-0 items-center justify-center rounded-[16px] text-2xl"
        style={{ background: groupFill(group.color) }}
      >
        {group.icon}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1.5">
        <span className="truncate text-base font-bold text-text">{group.name}</span>
        <span className="flex items-center gap-2">
          <AvatarStack people={members} size="xs" max={4} />
          <span className="text-xs text-text-2">
            {members.length} {members.length === 1 ? "member" : "members"}
          </span>
        </span>
      </span>
      <NetFigure net={net} settled={settled} />
    </Link>
  );
}
