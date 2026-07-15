"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, Plus, UserPlus, MoreVertical, Trash2, ArrowLeftRight, Receipt } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Segmented } from "@/components/ui/segmented";
import { Avatar, AvatarStack } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { ExpenseRow } from "@/components/features/expense-row";
import { PersonBalanceRow } from "@/components/features/person-balance-row";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useStore, useMyId } from "@/store/useStore";
import { useUI } from "@/store/useUI";
import { useToast } from "@/components/ui/toast";
import { myNetWithMembers, mySettleRows, simplifiedPlan } from "@/lib/balances";
import { formatINR } from "@/lib/utils";

export default function GroupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const groups = useStore((s) => s.groups);
  const people = useStore((s) => s.people);
  const expenses = useStore((s) => s.expenses);
  const deleteGroup = useStore((s) => s.deleteGroup);
  const openAdd = useUI((s) => s.openAdd);
  const openInvite = useUI((s) => s.openInvite);
  const openSettle = useUI((s) => s.openSettle);
  const { toast } = useToast();
  const myId = useMyId() ?? "";

  const [tab, setTab] = useState<"expenses" | "balances">("expenses");

  const group = groups.find((g) => g.id === id);

  if (!group) {
    return (
      <Card>
        <EmptyState
          icon={Receipt}
          title="Group not found"
          description="This group may have been deleted."
          action={<Button onClick={() => router.push("/groups")}>Back to groups</Button>}
        />
      </Card>
    );
  }

  const members = group.memberIds
    .map((mid) => people.find((p) => p.id === mid))
    .filter(Boolean) as NonNullable<ReturnType<typeof people.find>>[];
  const groupExpenses = expenses
    .filter((e) => e.groupId === group.id)
    .sort((a, b) => +new Date(b.date) - +new Date(a.date));

  // Balances are global (across all expenses + settlements) so settle-ups
  // reflect here too — filtered to this group's members.
  const memberSet = new Set(group.memberIds);
  const myNet = myNetWithMembers(expenses, myId, group.memberIds);
  const myBalances = mySettleRows(expenses, myId).filter((r) => memberSet.has(r.personId));
  const transfers = simplifiedPlan(expenses).filter((t) => memberSet.has(t.from) && memberSet.has(t.to));
  const nameOf = (pid: string) => (pid === myId ? "You" : people.find((p) => p.id === pid)?.name.split(" ")[0] ?? "—");

  return (
    <div className="flex flex-col gap-5">
      <Link href="/groups" className="-mb-1 flex w-fit items-center gap-1 text-sm font-medium text-text-2 hover:text-text">
        <ChevronLeft className="h-4 w-4" /> Groups
      </Link>

      {/* Group header */}
      <div className="flex items-center gap-3.5">
        <div
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[16px] text-3xl"
          style={{ background: `color-mix(in srgb, ${group.color} 16%, transparent)` }}
        >
          {group.icon}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-2xl font-bold tracking-[-0.02em]">{group.name}</h1>
          <div className="mt-1 flex items-center gap-2">
            <AvatarStack people={members} size="xs" max={5} />
            <span className="text-[0.78rem] text-text-3">{members.length} members</span>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button className="flex h-10 w-10 items-center justify-center rounded-full text-text-2 hover:bg-surface-inset" aria-label="Group options">
                <MoreVertical className="h-5 w-5" />
              </button>
            }
          />
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => openAdd(group.id)}>
              <Plus className="h-4 w-4" /> Add expense
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openInvite(group.id)}>
              <UserPlus className="h-4 w-4" /> Invite friend
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => {
                deleteGroup(group.id);
                toast({ message: "Group deleted", tone: "info" });
                router.push("/groups");
              }}
            >
              <Trash2 className="h-4 w-4" /> Delete group
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Net summary */}
      <Card className="flex items-center justify-between p-4">
        <div>
          <p className="text-[0.72rem] font-semibold uppercase tracking-wide text-text-3">Your balance here</p>
          <p className={`font-display text-2xl font-bold tnum ${myNet > 0.5 ? "text-positive" : myNet < -0.5 ? "text-negative" : "text-text"}`}>
            {Math.abs(myNet) < 0.5 ? "Settled" : formatINR(Math.abs(myNet))}
          </p>
          {Math.abs(myNet) >= 0.5 && (
            <p className="text-[0.78rem] text-text-2">{myNet > 0 ? "you are owed" : "you owe"}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => openInvite(group.id)}>
            <UserPlus className="h-4 w-4" /> Invite
          </Button>
          <Button size="sm" onClick={() => openAdd(group.id)}>
            <Plus className="h-4 w-4" /> Add
          </Button>
        </div>
      </Card>

      <Segmented
        value={tab}
        onChange={setTab}
        className="w-full"
        options={[
          { value: "expenses", label: `Expenses (${groupExpenses.length})` },
          { value: "balances", label: "Balances" },
        ]}
      />

      {tab === "expenses" ? (
        groupExpenses.length > 0 ? (
          <Card className="overflow-hidden">
            <div className="divide-y divide-border">
              {groupExpenses.map((e) => (
                <ExpenseRow key={e.id} expense={e} />
              ))}
            </div>
          </Card>
        ) : (
          <Card>
            <EmptyState
              icon={Receipt}
              title="No expenses yet"
              description="Add the first shared expense for this group."
              action={
                <Button onClick={() => openAdd(group.id)}>
                  <Plus className="h-4 w-4" /> Add expense
                </Button>
              }
            />
          </Card>
        )
      ) : (
        <div className="flex flex-col gap-4">
          {myBalances.length > 0 && (
            <div>
              <p className="mb-2 px-1 text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-text-3">
                Your balances
              </p>
              <Card className="overflow-hidden">
                <div className="divide-y divide-border">
                  {myBalances.map((b) => (
                    <PersonBalanceRow key={b.personId} personId={b.personId} amount={b.amount} groupId={group.id} />
                  ))}
                </div>
              </Card>
            </div>
          )}

          <div>
            <p className="mb-2 px-1 text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-text-3">
              Simplified settle-up
            </p>
            {transfers.length > 0 ? (
              <Card className="overflow-hidden">
                <div className="divide-y divide-border">
                  {transfers.map((t, i) => {
                    const involvesMe = t.from === myId || t.to === myId;
                    return (
                      <div key={i} className="flex items-center gap-3 px-4 py-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-inset text-text-3">
                          <ArrowLeftRight className="h-4 w-4" />
                        </div>
                        <p className="flex-1 text-[0.9rem] text-text">
                          <span className="font-semibold">{nameOf(t.from)}</span> pays{" "}
                          <span className="font-semibold">{nameOf(t.to)}</span>
                        </p>
                        <span className="tnum text-[0.9rem] font-semibold text-text">{formatINR(t.amount)}</span>
                        {involvesMe && (
                          <Button
                            size="sm"
                            variant={t.from === myId ? "primary" : "soft"}
                            onClick={() =>
                              openSettle({
                                personId: t.from === myId ? t.to : t.from,
                                amount: t.from === myId ? -t.amount : t.amount,
                                groupId: group.id,
                              })
                            }
                          >
                            {t.from === myId ? "Pay" : "Remind"}
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Card>
            ) : (
              <Card>
                <EmptyState icon={ArrowLeftRight} title="All settled" description="Everyone in this group is square." />
              </Card>
            )}
          </div>

          {/* Members */}
          <div>
            <p className="mb-2 px-1 text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-text-3">Members</p>
            <Card className="p-2">
              <div className="flex flex-col">
                {members.map((m) => (
                  <div key={m.id} className="flex items-center gap-3 rounded-[12px] px-2 py-2">
                    <Avatar person={m} size="sm" />
                    <span className="flex-1 text-[0.9rem] font-medium text-text">
                      {m.id === myId ? "You" : m.name}
                    </span>
                  </div>
                ))}
                <button
                  onClick={() => openInvite(group.id)}
                  className="flex items-center gap-3 rounded-[12px] px-2 py-2 text-brand transition-colors hover:bg-surface-inset"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-dashed border-brand/40">
                    <UserPlus className="h-4 w-4" />
                  </span>
                  <span className="text-[0.9rem] font-semibold">Invite a friend</span>
                </button>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
