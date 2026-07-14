"use client";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { usePerson } from "@/store/useStore";
import { useUI } from "@/store/useUI";
import { formatINR, cn } from "@/lib/utils";
import type { ID } from "@/lib/types";

export function PersonBalanceRow({
  personId,
  amount,
  groupId = null,
}: {
  personId: ID;
  amount: number; // + they owe you, − you owe them
  groupId?: ID | null;
}) {
  const person = usePerson(personId);
  const openSettle = useUI((s) => s.openSettle);
  const theyOwe = amount > 0;

  if (!person) return null;

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Avatar person={person} size="md" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-text">{person.name}</p>
        <p className="text-[0.82rem] text-text-2">
          {theyOwe ? "owes you " : "you owe "}
          <span className={cn("tnum font-semibold", theyOwe ? "text-positive" : "text-negative")}>
            {formatINR(Math.abs(amount))}
          </span>
        </p>
      </div>
      <Button
        size="sm"
        variant={theyOwe ? "soft" : "primary"}
        onClick={() => openSettle({ personId, amount, groupId })}
      >
        {theyOwe ? "Remind" : "Settle up"}
      </Button>
    </div>
  );
}
