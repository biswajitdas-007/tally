"use client";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { usePerson } from "@/store/useStore";
import { useUI } from "@/store/useUI";
import { formatINR, cn } from "@/lib/utils";
import type { ID } from "@/lib/types";

/** One person you're square-up-able with: who, which way the money goes, and the action. */
export function PersonBalanceRow({
  personId,
  amount,
  groupId = null,
  className,
}: Readonly<{
  personId: ID;
  /** + they owe you, − you owe them. */
  amount: number;
  groupId?: ID | null;
  className?: string;
}>) {
  const person = usePerson(personId);
  const openSettle = useUI((s) => s.openSettle);
  const theyOwe = amount > 0;

  if (!person) return null;

  return (
    <div className={cn("flex items-center gap-3 px-3.5 py-3", className)}>
      <Avatar person={person} size="md" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[0.9375rem] font-bold text-text">{person.name}</p>
        <p className={cn("text-[0.8125rem] font-bold tnum", theyOwe ? "text-positive" : "text-negative")}>
          {theyOwe ? "owes you " : "you owe "}
          {formatINR(Math.abs(amount))}
        </p>
      </div>
      <Button
        size="sm"
        variant={theyOwe ? "brass" : "primary"}
        className="h-10 rounded-full px-3.5 font-bold"
        onClick={() => openSettle({ personId, amount, groupId })}
      >
        {theyOwe ? "Remind" : "Settle up"}
      </Button>
    </div>
  );
}
