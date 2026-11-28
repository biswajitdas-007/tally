"use client";

import { Check, Plus, UserPlus, Users, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type QuickActionTone = "brand" | "violet" | "sky" | "sun";

/** Soft fill + darker icon for each tone; every pair keeps AA in light and dark. */
const TONES: Record<QuickActionTone, string> = {
  brand: "bg-brand-soft text-brand-on-soft",
  violet: "bg-violet-soft text-violet-on-soft",
  sky: "bg-sky-soft text-sky-on-soft",
  sun: "bg-sun-soft text-sun-on-soft",
};

function QuickAction({
  icon: Icon,
  label,
  tone,
  onClick,
}: Readonly<{ icon: LucideIcon; label: string; tone: QuickActionTone; onClick: () => void }>) {
  return (
    <Button
      variant="ghost"
      onClick={onClick}
      className="group h-auto flex-col gap-2 rounded-[20px] p-1 text-[0.8125rem] font-bold text-text hover:bg-transparent hover:text-text"
    >
      <span
        aria-hidden
        className={cn(
          "flex h-[60px] w-[60px] items-center justify-center rounded-[20px] transition-transform group-hover:-translate-y-0.5",
          TONES[tone],
        )}
      >
        <Icon className="size-6" strokeWidth={1.8} />
      </span>
      {label}
    </Button>
  );
}

/** The four one-tap actions under the balance card. */
export function QuickActions({
  onAdd,
  onSettle,
  onCreateGroup,
  onInvite,
}: Readonly<{ onAdd: () => void; onSettle: () => void; onCreateGroup: () => void; onInvite: () => void }>) {
  return (
    <div role="group" aria-label="Quick actions" className="grid grid-cols-4 gap-2.5">
      <QuickAction icon={Plus} label="Add" tone="brand" onClick={onAdd} />
      <QuickAction icon={Check} label="Settle" tone="violet" onClick={onSettle} />
      <QuickAction icon={Users} label="Group" tone="sky" onClick={onCreateGroup} />
      <QuickAction icon={UserPlus} label="Invite" tone="sun" onClick={onInvite} />
    </div>
  );
}
