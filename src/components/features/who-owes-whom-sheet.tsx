"use client";

import { useMemo } from "react";
import { ArrowLeftRight } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PersonDebtRow } from "@/components/features/person-debt-row";
import { useStore, useMyId } from "@/store/useStore";
import { useUI } from "@/store/useUI";
import { scopedDebts } from "@/lib/balances";

export function WhoOwesWhomSheet() {
  const open = useUI((s) => s.whoOwesWhomOpen);
  const close = useUI((s) => s.closeWhoOwesWhom);
  
  const myId = useMyId();
  const expenses = useStore((s) => s.expenses);
  const debts = useMemo(() => scopedDebts(expenses, myId ?? ""), [expenses, myId]);

  return (
    <Sheet open={open} onClose={close} title="Who owes whom" description="All your outstanding balances">
      {debts.length > 0 ? (
        <Card className="overflow-hidden">
          <div className="divide-y divide-border">
            {debts.map((d) => (
              <PersonDebtRow key={d.personId} debt={d} />
            ))}
          </div>
        </Card>
      ) : (
        <Card>
          <EmptyState
            icon={ArrowLeftRight}
            title="All settled up"
            description="No outstanding balances. Add an expense to start splitting."
          />
        </Card>
      )}
    </Sheet>
  );
}
