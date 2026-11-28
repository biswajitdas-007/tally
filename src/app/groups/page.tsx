"use client";

import { Plus, Users } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { GroupCard } from "@/components/features/group-card";
import { DirectCard } from "@/components/features/direct-card";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { useStore } from "@/store/useStore";
import { useUI } from "@/store/useUI";

export default function GroupsPage() {
  const groups = useStore((s) => s.groups);
  const openCreateGroup = useUI((s) => s.openCreateGroup);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Ledgers"
        subtitle="Direct splits & your groups"
        action={
          <Button onClick={openCreateGroup} className="rounded-full font-bold">
            <Plus className="size-4" strokeWidth={2} aria-hidden /> New
          </Button>
        }
      />

      {/* Direct (non-group) ledger — always available. */}
      <DirectCard />

      <section aria-labelledby="ledgers-groups" className="flex flex-col gap-2.5">
        <h2 id="ledgers-groups" className="mt-1 text-xl font-semibold tracking-[-0.02em] text-text">
          Your groups
        </h2>
        {groups.length > 0 ? (
          <div className="grid gap-2.5 xl:grid-cols-2">
            {groups.map((g) => (
              <GroupCard key={g.id} group={g} />
            ))}
            <Button
              variant="ghost"
              onClick={openCreateGroup}
              className="h-16 rounded-[22px] border-2 border-dashed border-border-strong text-[0.9375rem] font-bold"
            >
              <Plus className="size-5" strokeWidth={1.8} aria-hidden /> New group
            </Button>
          </div>
        ) : (
          <Card>
            <EmptyState
              icon={Users}
              title="No groups yet"
              description="Create a group for your flat, trip or friends to split expenses together."
              action={
                <Button onClick={openCreateGroup}>
                  <Plus className="h-4 w-4" /> Create a group
                </Button>
              }
            />
          </Card>
        )}
      </section>
    </div>
  );
}
