import { Checkbox } from "@/components/ui/checkbox";
import { scopeKey } from "@/lib/settle";
import type { ScopeAmount, ScopeId } from "@/lib/balances";
import { cn, formatINR } from "@/lib/utils";

/** Pick which ledgers to settle, when there's more than one with this person. */
export function ScopeChecklist({
  scopes,
  unticked,
  labelOf,
  onToggle,
}: Readonly<{
  scopes: ScopeAmount[];
  unticked: ReadonlySet<string>;
  labelOf: (id: ScopeId) => string;
  onToggle: (id: ScopeId, on: boolean) => void;
}>) {
  return (
    // min-w-0: a fieldset is min-content wide by default, which would let a long group name push the sheet sideways.
    <fieldset className="flex min-w-0 flex-col gap-2">
      <legend className="mb-2 px-0.5 text-[0.8125rem] font-semibold text-text-2">What to settle</legend>
      {scopes.map((s) => {
        const key = scopeKey(s.scopeId);
        const on = !unticked.has(key);
        const owe = s.amount < 0;
        return (
          <label
            key={key}
            className={cn(
              "flex min-h-12 cursor-pointer items-center gap-3 rounded-[18px] border-2 px-3.5 py-3 transition-colors",
              on ? "border-brand" : "border-border hover:bg-surface-2",
            )}
          >
            <Checkbox checked={on} onCheckedChange={(next) => onToggle(s.scopeId, next)} />
            <span className="min-w-0 flex-1 truncate text-[0.9375rem] font-bold text-text">{labelOf(s.scopeId)}</span>
            <span className={cn("text-[0.8125rem] font-extrabold tabular-nums", owe ? "text-negative" : "text-positive")}>
              {owe ? "you owe" : "owes you"} {formatINR(Math.abs(s.amount))}
            </span>
          </label>
        );
      })}
    </fieldset>
  );
}
