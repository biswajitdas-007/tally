"use client";

import { useMemo, useState } from "react";
import { Users, UserPlus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { useStore, useMyId } from "@/store/useStore";
import { useUI } from "@/store/useUI";
import { scopedDebts } from "@/lib/balances";
import { formatINR } from "@/lib/utils";
import type { Person } from "@/lib/types";

export default function FriendsPage() {
  const people = useStore((s) => s.people);
  const expenses = useStore((s) => s.expenses);
  const removedFriends = useStore((s) => s.removedFriends);
  const deleteFriend = useStore((s) => s.deleteFriend);
  const myId = useMyId() ?? "";
  const openInvite = useUI((s) => s.openInvite);
  const openSettle = useUI((s) => s.openSettle);
  const { toast } = useToast();

  const [toRemove, setToRemove] = useState<Person | null>(null);
  const [removing, setRemoving] = useState(false);

  const balMap = useMemo(
    () => new Map(scopedDebts(expenses, myId).map((d) => [d.personId, d.total])),
    [expenses, myId],
  );

  const friends = useMemo(
    () =>
      people
        .filter((p) => p.id !== myId)
        // Removed friends stay hidden — unless there's a live balance, in which
        // case we never hide something you still need to settle.
        .filter((p) => !removedFriends.includes(p.id) || Math.abs(balMap.get(p.id) ?? 0) > 0.01)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [people, myId, removedFriends, balMap],
  );

  async function confirmRemove() {
    if (!toRemove) return;
    setRemoving(true);
    const res = await deleteFriend(toRemove.id);
    setRemoving(false);
    if (res.ok) {
      toast({ message: `Removed ${toRemove.name}` });
      setToRemove(null);
    } else if (res.unsettled) {
      toast({ message: `Settle up with ${toRemove.name} first` });
      setToRemove(null);
    } else {
      toast({ message: "Couldn't remove — please try again" });
    }
  }

  return (
    <div>
      <PageHeader
        title="Friends"
        subtitle={`${friends.length} ${friends.length === 1 ? "person" : "people"}`}
        action={
          <Button size="sm" onClick={() => openInvite(null)}>
            <UserPlus className="h-4 w-4" /> Invite
          </Button>
        }
      />

      {friends.length > 0 ? (
        <Card className="overflow-hidden">
          <div className="divide-y divide-border">
            {friends.map((f) => {
              const amount = balMap.get(f.id) ?? 0;
              const theyOwe = amount > 0.01;
              const iOwe = amount < -0.01;
              const settled = !theyOwe && !iOwe;
              return (
                <div key={f.id} className="flex items-center gap-1 pr-1.5">
                  <button
                    onClick={() => (theyOwe || iOwe) && openSettle({ personId: f.id, amount })}
                    className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-2 active:bg-surface-inset"
                  >
                    <Avatar person={f} size="md" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-medium text-text">{f.name}</p>
                        {f.pending && <Badge tone="warning">pending</Badge>}
                      </div>
                      <p className="truncate text-[0.78rem] text-text-3">
                        {f.upiId || f.email || "No UPI ID yet"}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      {theyOwe ? (
                        <>
                          <p className="text-[0.66rem] font-medium uppercase tracking-wide text-text-3">owes you</p>
                          <p className="tnum text-[0.9rem] font-semibold text-positive">{formatINR(amount)}</p>
                        </>
                      ) : iOwe ? (
                        <>
                          <p className="text-[0.66rem] font-medium uppercase tracking-wide text-text-3">you owe</p>
                          <p className="tnum text-[0.9rem] font-semibold text-negative">{formatINR(-amount)}</p>
                        </>
                      ) : (
                        <span className="rounded-full bg-surface-inset px-2.5 py-1 text-[0.72rem] font-semibold text-text-2">
                          settled
                        </span>
                      )}
                    </div>
                  </button>
                  <button
                    onClick={() =>
                      settled ? setToRemove(f) : toast({ message: `Settle up with ${f.name} first` })
                    }
                    aria-label={`Remove ${f.name}`}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-text-3 transition-colors hover:bg-negative-soft hover:text-negative active:scale-95"
                  >
                    <Trash2 className="h-[1.05rem] w-[1.05rem]" />
                  </button>
                </div>
              );
            })}
          </div>
        </Card>
      ) : (
        <Card>
          <EmptyState
            icon={Users}
            title="No friends yet"
            description="Invite a friend and they'll show up here once they join."
            action={
              <Button onClick={() => openInvite(null)}>
                <UserPlus className="h-4 w-4" /> Invite a friend
              </Button>
            }
          />
        </Card>
      )}

      <Sheet
        open={Boolean(toRemove)}
        onClose={() => !removing && setToRemove(null)}
        title="Remove friend?"
        description={toRemove ? `${toRemove.name} will be removed from your friends list.` : ""}
      >
        <div className="flex flex-col gap-4 pt-2">
          <p className="text-sm leading-relaxed text-text-2">
            You&apos;re all settled up, so this is safe. They&apos;ll stay in any groups you share, and
            they&apos;ll reappear here if you start splitting with them again.
          </p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="lg"
              className="flex-1"
              onClick={() => setToRemove(null)}
              disabled={removing}
            >
              Cancel
            </Button>
            <Button variant="destructive" size="lg" className="flex-1" loading={removing} onClick={confirmRemove}>
              <Trash2 className="h-4 w-4" /> Remove
            </Button>
          </div>
        </div>
      </Sheet>
    </div>
  );
}
