"use client";

import { Users, UserPlus } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { useStore, useMyId } from "@/store/useStore";
import { useUI } from "@/store/useUI";
import { mySettleRows } from "@/lib/balances";
import { formatINR } from "@/lib/utils";

export default function FriendsPage() {
  const people = useStore((s) => s.people);
  const expenses = useStore((s) => s.expenses);
  const myId = useMyId() ?? "";
  const openInvite = useUI((s) => s.openInvite);
  const openSettle = useUI((s) => s.openSettle);

  const friends = people.filter((p) => p.id !== myId).sort((a, b) => a.name.localeCompare(b.name));
  const balMap = new Map(mySettleRows(expenses, myId).map((r) => [r.personId, r.amount]));

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
              return (
                <button
                  key={f.id}
                  onClick={() => (theyOwe || iOwe) && openSettle({ personId: f.id, amount })}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-2 active:bg-surface-inset"
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
    </div>
  );
}
