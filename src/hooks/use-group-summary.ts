"use client";

import { useMemo } from "react";
import { useStore, useMyId } from "@/store/useStore";
import { myScopeNet } from "@/lib/balances";
import type { Group, Person } from "@/lib/types";

/** A group's members and where the current user stands in it (net < 0 means they owe). */
export function useGroupSummary(group: Group) {
  const people = useStore((s) => s.people);
  const expenses = useStore((s) => s.expenses);
  const myId = useMyId();

  const members = useMemo(
    () =>
      group.memberIds
        .map((id) => people.find((p) => p.id === id))
        .filter((p): p is Person => Boolean(p)),
    [group.memberIds, people],
  );
  const net = useMemo(() => myScopeNet(expenses, myId ?? "", group.id), [expenses, myId, group.id]);

  return { members, net, settled: Math.abs(net) < 0.5 };
}
