import { User } from "lucide-react";
import { Card } from "@/components/ui/card";
import { GroupIcon } from "@/components/ui/group-icon";
import { formatINR } from "@/lib/utils";
import type { GroupSpend } from "@/lib/insights";

/** Insights: how your split spending divides between groups (all time). */
export function GroupSpendCard({ rows }: Readonly<{ rows: GroupSpend[] }>) {
  const total = rows.reduce((sum, r) => sum + r.amount, 0) || 1;
  return (
    <Card className="p-5">
      <p className="mb-3 text-[0.72rem] font-semibold uppercase tracking-wide text-text-3">
        Split spending by group (all time)
      </p>
      <div className="flex flex-col gap-3.5">
        {rows.map((r) => (
          <div key={r.id}>
            <div className="mb-1.5 flex items-center gap-2">
              {r.personal ? (
                <User className="size-4 shrink-0 text-text-2" strokeWidth={1.8} aria-hidden />
              ) : (
                <GroupIcon icon={r.icon} className="size-4 text-text-2" />
              )}
              <span className="flex-1 text-[0.85rem] font-medium text-text">{r.name}</span>
              <span className="text-[0.85rem] font-semibold text-text tnum">{formatINR(r.amount)}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-surface-inset">
              <div
                className="h-full rounded-full bg-brand transition-all"
                style={{ width: `${(r.amount / total) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
