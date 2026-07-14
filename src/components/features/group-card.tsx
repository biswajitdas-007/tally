"use client";

import Link from "next/link";
import { useStore } from "@/store/useStore";
import { memberNet } from "@/lib/balances";
import { ME_ID } from "@/lib/seed";
import { AvatarStack } from "@/components/ui/avatar";
import { formatINR, cn } from "@/lib/utils";
import type { Group } from "@/lib/types";

export function GroupCard({ group }: { group: Group }) {
  const people = useStore((s) => s.people);
  const expenses = useStore((s) => s.expenses);

  const members = group.memberIds.map((id) => people.find((p) => p.id === id)).filter(Boolean) as NonNullable<
    ReturnType<typeof people.find>
  >[];
  const groupExpenses = expenses.filter((e) => e.groupId === group.id);
  const net = memberNet(groupExpenses).get(ME_ID) ?? 0;
  const settled = Math.abs(net) < 0.5;

  return (
    <Link
      href={`/groups/${group.id}`}
      className="group flex items-center gap-3.5 rounded-[16px] border border-border bg-surface p-3.5 shadow-[var(--shadow-xs)] transition-all hover:-translate-y-0.5 hover:border-border-strong hover:shadow-[var(--shadow-md)]"
    >
      <div
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] text-2xl"
        style={{ background: `color-mix(in srgb, ${group.color} 16%, transparent)` }}
      >
        {group.icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-text">{group.name}</p>
        <div className="mt-1 flex items-center gap-2">
          <AvatarStack people={members} size="xs" max={4} />
          <span className="text-[0.75rem] text-text-3">
            {members.length} {members.length === 1 ? "member" : "members"}
          </span>
        </div>
      </div>
      <div className="shrink-0 text-right">
        {settled ? (
          <span className="rounded-full bg-surface-inset px-2.5 py-1 text-[0.72rem] font-semibold text-text-2">
            all settled
          </span>
        ) : (
          <>
            <p className="text-[0.68rem] font-medium uppercase tracking-wide text-text-3">
              {net > 0 ? "you're owed" : "you owe"}
            </p>
            <p className={cn("tnum font-semibold", net > 0 ? "text-positive" : "text-negative")}>
              {formatINR(Math.abs(net))}
            </p>
          </>
        )}
      </div>
    </Link>
  );
}
