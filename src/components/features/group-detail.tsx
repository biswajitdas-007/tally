"use client";

import Link from "next/link";
import { ArrowLeftRight, ChevronLeft, Info, MoreHorizontal, Plus, Receipt, Trash2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AvatarStack } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AccentName } from "@/components/app/accent-name";
import { ExpenseRow } from "@/components/features/expense-row";
import { PersonBalanceRow } from "@/components/features/person-balance-row";
import { groupFill } from "@/lib/group-colour";
import { groupByDay } from "@/lib/activity";
import type { Transfer } from "@/lib/balances";
import { formatINR, cn } from "@/lib/utils";
import type { Expense, Group, ID, Person } from "@/lib/types";

/** A translucent wash of the header's text colour, for controls sitting on the band. */
const ON_BAND_WASH =
  "bg-[color-mix(in_srgb,var(--on-tile)_16%,transparent)] hover:bg-[color-mix(in_srgb,var(--on-tile)_24%,transparent)]";

/** The brand ring vanishes on some band colours; the on-band text colour is ≥5:1 on all of them. */
const ON_BAND_FOCUS = "focus-visible:outline-[var(--on-tile)] focus-visible:ring-0";

/** The coloured band at the top: back link, options, icon, name and members. */
export function GroupHeader({
  group,
  members,
  onInfo,
  onDelete,
}: Readonly<{ group: Group; members: Person[]; onInfo: () => void; onDelete: () => void }>) {
  return (
    <header
      className="relative -mx-4 -mt-4 overflow-hidden px-4 pt-3 pb-16 text-on-tile md:mx-0 md:mt-0 md:rounded-[28px] md:px-6 md:pt-5"
      style={{ "--band": groupFill(group.color), background: "var(--band)" } as React.CSSProperties}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute top-10 -right-8 size-[140px] rounded-full bg-[color-mix(in_srgb,var(--on-tile)_12%,transparent)]"
      />

      <div className="relative flex items-center justify-between">
        <Link
          href="/groups"
          className={cn("-ml-1 flex h-11 items-center gap-1 rounded-[12px] pr-2 pl-1 text-[0.9375rem] font-bold", ON_BAND_FOCUS)}
        >
          <ChevronLeft className="size-5" strokeWidth={1.8} aria-hidden /> Ledgers
        </Link>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                aria-label="Group options"
                className={cn("size-11 rounded-[14px] text-on-tile hover:text-on-tile", ON_BAND_WASH, ON_BAND_FOCUS)}
              >
                <MoreHorizontal className="size-5" strokeWidth={1.8} aria-hidden />
              </Button>
            }
          />
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onInfo}>
              <Info className="h-4 w-4" /> Group info
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={onDelete}>
              <Trash2 className="h-4 w-4" /> Delete group
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="relative mt-3 flex items-center gap-3.5">
        <span
          aria-hidden
          className="flex size-[60px] shrink-0 items-center justify-center rounded-[20px] bg-surface text-3xl"
        >
          {group.icon}
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-[1.875rem] leading-[1.1] font-semibold tracking-[-0.035em]">
            <AccentName name={group.name} />
          </h1>
          <div className="mt-1.5 flex items-center gap-2">
            <AvatarStack people={members} size="xs" max={5} ringClassName="ring-[var(--band)]" />
            <span className="text-[0.8125rem] font-semibold">
              {members.length} {members.length === 1 ? "member" : "members"}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}

function netTone(net: number): string {
  if (net > 0.5) return "text-positive";
  if (net < -0.5) return "text-negative";
  return "text-text";
}

/** Your position in this group, floating over the band, with Invite and Add. */
export function GroupBalanceCard({
  net,
  onInvite,
  onAdd,
}: Readonly<{ net: number; onInvite: () => void; onAdd: () => void }>) {
  const settled = Math.abs(net) < 0.5;
  return (
    <section
      aria-label="Your balance here"
      className="relative -mt-11 flex items-center gap-3 rounded-[26px] md:mx-4 border border-transparent bg-surface p-[18px] shadow-[var(--shadow-lg)] dark:border-border"
    >
      <div className={cn("min-w-0 flex-1", netTone(net))}>
        <p className="text-[0.8125rem] font-semibold text-text-2">Your balance here</p>
        <p className="text-[1.875rem] leading-tight font-semibold tracking-[-0.03em] tnum">
          {settled ? "Settled" : formatINR(Math.abs(net))}
        </p>
        {!settled && <p className="text-[0.8125rem] font-semibold">{net > 0 ? "you are owed" : "you owe"}</p>}
      </div>
      <Button
        variant="secondary"
        onClick={onInvite}
        className="shrink-0 rounded-full border-0 bg-surface-inset px-3.5 font-bold shadow-none"
      >
        <UserPlus className="size-4" strokeWidth={1.8} aria-hidden /> Invite
      </Button>
      <Button onClick={onAdd} className="shrink-0 rounded-full px-4 font-bold">
        <Plus className="size-4" strokeWidth={2} aria-hidden /> Add
      </Button>
    </section>
  );
}

/** The group's expenses under day headings. */
export function GroupExpenses({ expenses, onAdd }: Readonly<{ expenses: Expense[]; onAdd: () => void }>) {
  if (expenses.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={Receipt}
          title="No expenses yet"
          description="Add the first shared expense for this group."
          action={
            <Button onClick={onAdd}>
              <Plus className="h-4 w-4" /> Add expense
            </Button>
          }
        />
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {groupByDay(expenses).map((day) => (
        <div key={day.key}>
          <h2 className="py-1 text-xs font-semibold tracking-[0.06em] text-text-2 uppercase">{day.label}</h2>
          <div className="-mx-4 flex flex-col md:-mx-2">
            {day.items.map((e) => (
              <ExpenseRow key={e.id} expense={e} detail="none" className="rounded-[16px] py-2 md:px-2" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function TransferRow({
  transfer,
  myId,
  nameOf,
  onSettle,
}: Readonly<{ transfer: Transfer; myId: ID; nameOf: (id: ID) => string; onSettle: (t: Transfer) => void }>) {
  const iPay = transfer.from === myId;
  const involvesMe = iPay || transfer.to === myId;
  return (
    <li className="flex items-center gap-2.5 rounded-[18px] bg-surface-2 px-3.5 py-3">
      <span className="min-w-0 flex-1 text-sm text-text">
        <b className="font-bold">{nameOf(transfer.from)}</b> pays <b className="font-bold">{nameOf(transfer.to)}</b>
      </span>
      <span className="text-[0.9375rem] font-semibold text-text tnum">{formatINR(transfer.amount)}</span>
      {involvesMe && (
        <Button
          size="sm"
          variant={iPay ? "primary" : "brass"}
          className="rounded-full font-bold"
          onClick={() => onSettle(transfer)}
        >
          {iPay ? "Pay" : "Remind"}
        </Button>
      )}
    </li>
  );
}

/** Who you're square with in this group, and the fewest payments that clear it. */
export function GroupBalances({
  groupId,
  myId,
  balances,
  transfers,
  nameOf,
  onSettle,
}: Readonly<{
  groupId: ID;
  myId: ID;
  balances: { personId: ID; amount: number }[];
  transfers: Transfer[];
  nameOf: (id: ID) => string;
  onSettle: (t: Transfer) => void;
}>) {
  return (
    <div className="flex flex-col gap-[18px]">
      {balances.length > 0 && (
        <section aria-labelledby="group-your-balances" className="flex flex-col gap-2.5">
          <h2 id="group-your-balances" className="text-lg font-semibold text-text">
            Your balances
          </h2>
          {balances.map((b) => (
            <PersonBalanceRow
              key={b.personId}
              personId={b.personId}
              amount={b.amount}
              groupId={groupId}
              className="rounded-[20px] border-[1.5px] border-border"
            />
          ))}
        </section>
      )}

      <section aria-labelledby="group-settle-plan" className="flex flex-col gap-2.5">
        <div>
          <h2 id="group-settle-plan" className="text-lg font-semibold text-text">
            Simplified settle-up
          </h2>
          {transfers.length > 0 && (
            <p className="text-[0.8125rem] text-text-2">
              {transfers.length === 1 ? "1 payment clears" : `${transfers.length} payments clear`} the whole group.
            </p>
          )}
        </div>
        {transfers.length > 0 ? (
          <ul className="flex flex-col gap-2.5">
            {transfers.map((t) => (
              <TransferRow key={`${t.from}-${t.to}`} transfer={t} myId={myId} nameOf={nameOf} onSettle={onSettle} />
            ))}
          </ul>
        ) : (
          <Card>
            <EmptyState icon={ArrowLeftRight} title="All settled up" description="No one owes anything in this group." />
          </Card>
        )}
      </section>
    </div>
  );
}
