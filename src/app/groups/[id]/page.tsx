"use client";

import { useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui/empty-state";
import { GroupBalanceCard, GroupBalances, GroupExpenses, GroupHeader } from "@/components/features/group-detail";
import { useGroupSummary } from "@/hooks/use-group-summary";
import { useStore, useMyId } from "@/store/useStore";
import { useUI } from "@/store/useUI";
import { mySettleRows, simplifiedPlan, type Transfer } from "@/lib/balances";
import type { Group } from "@/lib/types";

const TAB = "rounded-full";

function GroupNotFound() {
  const router = useRouter();
  return (
    <Card>
      <EmptyState
        icon={Receipt}
        title="Group not found"
        description="This group may have been deleted."
        action={<Button onClick={() => router.push("/groups")}>Back to ledgers</Button>}
      />
    </Card>
  );
}

function GroupDetail({ group }: Readonly<{ group: Group }>) {
  const people = useStore((s) => s.people);
  const expenses = useStore((s) => s.expenses);
  const openAdd = useUI((s) => s.openAdd);
  const openInvite = useUI((s) => s.openInvite);
  const openGroupSettings = useUI((s) => s.openGroupSettings);
  const openDeleteGroup = useUI((s) => s.openDeleteGroup);
  const openSettle = useUI((s) => s.openSettle);
  const myId = useMyId() ?? "";
  const { members, net } = useGroupSummary(group);

  // Scoped to THIS group's ledger only — a settlement here won't touch your
  // balances elsewhere, and simplification runs within the group.
  const groupExpenses = useMemo(() => expenses.filter((e) => e.groupId === group.id), [expenses, group.id]);
  const myBalances = useMemo(() => mySettleRows(groupExpenses, myId), [groupExpenses, myId]);
  const transfers = useMemo(() => simplifiedPlan(groupExpenses), [groupExpenses]);

  const nameOf = (pid: string) =>
    pid === myId ? "You" : (people.find((p) => p.id === pid)?.name.split(" ")[0] ?? "—");
  const settle = (t: Transfer) => {
    const iPay = t.from === myId;
    openSettle({ personId: iPay ? t.to : t.from, amount: iPay ? -t.amount : t.amount, groupId: group.id });
  };

  return (
    <div className="flex flex-col gap-[18px] md:mx-auto md:w-full md:max-w-[720px]">
      <GroupHeader
        group={group}
        members={members}
        onInfo={() => openGroupSettings(group.id)}
        onDelete={() => openDeleteGroup(group.id)}
      />
      <GroupBalanceCard net={net} onInvite={() => openInvite(group.id)} onAdd={() => openAdd(group.id)} />

      <Tabs defaultValue="expenses">
        <TabsList aria-label="Group view" className="w-full rounded-full p-1">
          <TabsTrigger value="expenses" className={TAB}>
            Expenses ({groupExpenses.length})
          </TabsTrigger>
          <TabsTrigger value="balances" className={TAB}>
            Balances
          </TabsTrigger>
        </TabsList>

        <TabsContent value="expenses">
          <GroupExpenses expenses={groupExpenses} onAdd={() => openAdd(group.id)} />
        </TabsContent>
        <TabsContent value="balances">
          <GroupBalances
            groupId={group.id}
            myId={myId}
            balances={myBalances}
            transfers={transfers}
            nameOf={nameOf}
            onSettle={settle}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function GroupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const group = useStore((s) => s.groups.find((g) => g.id === id));
  return group ? <GroupDetail group={group} /> : <GroupNotFound />;
}
