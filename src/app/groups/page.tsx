"use client";

import { Plus, Users } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { GroupCard } from "@/components/features/group-card";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { useStore } from "@/store/useStore";
import { useUI } from "@/store/useUI";

export default function GroupsPage() {
  const groups = useStore((s) => s.groups);
  const openCreateGroup = useUI((s) => s.openCreateGroup);

  return (
    <div>
      <PageHeader
        title="Groups"
        subtitle={`${groups.length} ${groups.length === 1 ? "group" : "groups"}`}
        action={
          <Button size="sm" onClick={openCreateGroup}>
            <Plus className="h-4 w-4" /> New
          </Button>
        }
      />
      {groups.length > 0 ? (
        <div className="flex flex-col gap-2.5">
          {groups.map((g) => (
            <GroupCard key={g.id} group={g} />
          ))}
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
    </div>
  );
}
