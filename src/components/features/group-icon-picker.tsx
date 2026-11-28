"use client";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { GroupIcon } from "@/components/ui/group-icon";
import { GROUP_ICONS, type GroupIconKey } from "@/lib/group-icons";

/** Single-choice grid of group icons (always one selected), on the shadcn ToggleGroup. */
export function GroupIconPicker({
  value,
  onChange,
  labelledBy,
}: Readonly<{ value: GroupIconKey; onChange: (key: GroupIconKey) => void; labelledBy?: string }>) {
  return (
    <ToggleGroup
      variant="outline"
      value={[value]}
      onValueChange={(next) => {
        const picked = next[0] as GroupIconKey | undefined;
        if (picked && picked !== value) onChange(picked);
      }}
      aria-labelledby={labelledBy}
      className="grid w-full grid-cols-8 gap-2 max-sm:grid-cols-6"
    >
      {GROUP_ICONS.map(({ key, label }) => (
        <ToggleGroupItem
          key={key}
          value={key}
          aria-label={label}
          title={label}
          className="aspect-square h-auto w-full min-w-0 rounded-[14px] px-0 data-pressed:border-brand data-pressed:bg-brand-soft data-pressed:text-brand-on-soft"
        >
          <GroupIcon icon={key} className="size-5" />
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
