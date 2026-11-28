"use client";

import { Check } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { Toggle } from "@/components/ui/toggle";
import { formatINR, sanitizeMoneyInput, cn } from "@/lib/utils";
import type { SplitMode } from "@/lib/expense-form";
import type { ID, Person } from "@/lib/types";

function SplitSummary({
  mode,
  count,
  perHead,
  remaining,
}: Readonly<{ mode: SplitMode; count: number; perHead: number; remaining: number }>) {
  if (mode === "equal") {
    if (count === 0) return <p className="text-[0.8125rem] text-negative">Select at least one person</p>;
    return (
      <p className="text-[0.8125rem] text-text-2">
        {formatINR(perHead)} per person · {count} {count === 1 ? "person" : "people"}
      </p>
    );
  }
  if (Math.abs(remaining) < 0.01) return <p className="text-[0.8125rem] font-semibold text-positive">Splits add up</p>;
  return (
    <p className={cn("text-[0.8125rem]", remaining < 0 ? "text-negative" : "text-text-2")}>
      {formatINR(Math.abs(remaining))} {remaining > 0 ? "left to assign" : "over"}
    </p>
  );
}

/** One person as a press-to-include avatar. */
function PersonToggle({
  person,
  name,
  included,
  onToggle,
}: Readonly<{ person: Person; name: string; included: boolean; onToggle: () => void }>) {
  return (
    <Toggle
      pressed={included}
      onPressedChange={onToggle}
      className="h-auto flex-col gap-1.5 rounded-[16px] px-1 py-1.5 data-pressed:bg-transparent hover:bg-surface-inset"
    >
      <span className={cn("relative rounded-full p-0.5 ring-2", included ? "ring-brand" : "ring-transparent")}>
        <Avatar person={person} size="lg" className={cn(!included && "opacity-40 grayscale")} />
        {included && (
          <span
            aria-hidden
            className="absolute -right-0.5 -bottom-0.5 flex size-5 items-center justify-center rounded-full bg-brand text-on-brand ring-2 ring-[var(--surface)]"
          >
            <Check className="size-3" strokeWidth={3} />
          </span>
        )}
      </span>
      <span className={cn("max-w-[4.5rem] truncate text-xs font-bold", included ? "text-text" : "text-text-2")}>
        {name}
      </span>
    </Toggle>
  );
}

/** Who's in the expense, how it's divided, and (in exact mode) each person's share. */
export function ParticipantPicker({
  people,
  participants,
  mode,
  exact,
  perHead,
  remaining,
  nameOf,
  onModeChange,
  onToggle,
  onExactChange,
}: Readonly<{
  people: Person[];
  participants: ID[];
  mode: SplitMode;
  exact: Record<ID, string>;
  perHead: number;
  remaining: number;
  nameOf: (id: ID) => string;
  onModeChange: (m: SplitMode) => void;
  onToggle: (id: ID) => void;
  onExactChange: (id: ID, value: string) => void;
}>) {
  const included = people.filter((p) => participants.includes(p.id));
  return (
    <section aria-labelledby="expense-split-label" className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between gap-3">
        <span id="expense-split-label" className="text-[0.8125rem] font-bold text-text-2">
          Split between
        </span>
        <Segmented
          aria-label="Split method"
          value={mode}
          onChange={onModeChange}
          options={[
            { value: "equal", label: "Equally" },
            { value: "exact", label: "Exactly" },
          ]}
          className="rounded-full p-[3px] [&>*]:h-8 [&>*]:rounded-full [&>*]:px-3 [&>*]:text-xs"
        />
      </div>

      <div className="grid grid-cols-4 gap-1">
        {people.map((p) => (
          <PersonToggle
            key={p.id}
            person={p}
            name={nameOf(p.id)}
            included={participants.includes(p.id)}
            onToggle={() => onToggle(p.id)}
          />
        ))}
      </div>

      {mode === "exact" && included.length > 0 && (
        <div className="flex flex-col divide-y divide-border rounded-[16px] border-[1.5px] border-border">
          {included.map((p) => (
            <div key={p.id} className="flex items-center gap-3 px-3 py-2">
              <Avatar person={p} size="sm" />
              <label htmlFor={`share-${p.id}`} className="flex-1 truncate text-sm font-semibold text-text">
                {nameOf(p.id)}
              </label>
              <span aria-hidden className="text-text-2">
                ₹
              </span>
              <Input
                id={`share-${p.id}`}
                value={exact[p.id] ?? ""}
                onChange={(e) => onExactChange(p.id, sanitizeMoneyInput(e.target.value))}
                inputMode="decimal"
                placeholder="0"
                autoComplete="off"
                className="h-10 w-24 text-right tnum"
              />
            </div>
          ))}
        </div>
      )}

      <SplitSummary mode={mode} count={participants.length} perHead={perHead} remaining={remaining} />
    </section>
  );
}
