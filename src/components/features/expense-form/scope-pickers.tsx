"use client";

import { ChevronDown, Users } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { GroupIcon } from "@/components/ui/group-icon";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { groupFill } from "@/lib/group-colour";
import type { Group, ID, Person } from "@/lib/types";

const FRIENDS = "__friends";
const TRIGGER =
  "h-11 w-full justify-start gap-2 rounded-[14px] border-[1.5px] px-3 text-sm font-bold tracking-normal shadow-none active:scale-100";

/** A group's small colour tile, or the friends icon for one-on-one splits. */
function ScopeBadge({ group }: Readonly<{ group: Group | undefined }>) {
  if (!group) {
    return (
      <span aria-hidden className="flex size-[22px] shrink-0 items-center justify-center rounded-[7px] bg-surface-inset">
        <Users className="size-3.5" strokeWidth={1.8} />
      </span>
    );
  }
  return (
    <span
      aria-hidden
      className="flex size-[22px] shrink-0 items-center justify-center rounded-[7px] text-on-tile"
      style={{ background: groupFill(group.color) }}
    >
      <GroupIcon icon={group.icon} className="size-3.5" />
    </span>
  );
}

/** Where the expense is split: a group, or friends one-on-one. Fixed when opened from a group. */
export function GroupPicker({
  groups,
  groupId,
  locked,
  onChange,
}: Readonly<{ groups: Group[]; groupId: ID | null; locked: boolean; onChange: (id: ID | null) => void }>) {
  const current = groups.find((g) => g.id === groupId);
  const label = current?.name ?? "Friends";
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <span id="expense-group-label" className="text-[0.8125rem] font-bold text-text-2">
        Split within
      </span>
      {locked ? (
        <div className="flex h-11 items-center gap-2 rounded-[14px] bg-surface-inset px-3 text-sm font-bold text-text">
          <ScopeBadge group={current} />
          <span className="truncate">{label}</span>
        </div>
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="outline" aria-labelledby="expense-group-label expense-group-value" className={TRIGGER}>
                <ScopeBadge group={current} />
                <span id="expense-group-value" className="min-w-0 flex-1 truncate text-left">
                  {label}
                </span>
                <ChevronDown className="size-4 text-text-3" strokeWidth={1.8} aria-hidden />
              </Button>
            }
          />
          <DropdownMenuContent align="start" className="min-w-56">
            <DropdownMenuRadioGroup
              value={groupId ?? FRIENDS}
              onValueChange={(v) => onChange(v === FRIENDS ? null : (v as ID))}
            >
              <DropdownMenuRadioItem value={FRIENDS} closeOnClick>
                <ScopeBadge group={undefined} /> Friends
              </DropdownMenuRadioItem>
              {groups.map((g) => (
                <DropdownMenuRadioItem key={g.id} value={g.id} closeOnClick>
                  <ScopeBadge group={g} /> {g.name}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

/** Who paid, from the people this expense can be split among. */
export function PayerPicker({
  people,
  paidBy,
  nameOf,
  onChange,
}: Readonly<{ people: Person[]; paidBy: ID; nameOf: (id: ID) => string; onChange: (id: ID) => void }>) {
  const payer = people.find((p) => p.id === paidBy);
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <span id="expense-payer-label" className="text-[0.8125rem] font-bold text-text-2">
        Paid by
      </span>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="outline" aria-labelledby="expense-payer-label expense-payer-value" className={TRIGGER}>
              <Avatar person={payer} size="xs" />
              <span id="expense-payer-value" className="min-w-0 flex-1 truncate text-left">
                {nameOf(paidBy)}
              </span>
              <ChevronDown className="size-4 text-text-3" strokeWidth={1.8} aria-hidden />
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="min-w-48">
          <DropdownMenuRadioGroup value={paidBy} onValueChange={(v) => onChange(v as ID)}>
            {people.map((p) => (
              <DropdownMenuRadioItem key={p.id} value={p.id} closeOnClick>
                <Avatar person={p} size="xs" /> {nameOf(p.id)}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
