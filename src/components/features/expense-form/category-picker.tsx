"use client";

import { useEffect, useRef } from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { CategoryIcon } from "@/components/ui/chip";
import { CATEGORY_LIST } from "@/lib/categories";
import type { CategoryKey } from "@/lib/types";

/**
 * Single-choice category pills. The chosen one gets a wash of its category
 * colour and a border of that colour mixed 30% toward the text colour, which
 * keeps it ≥4.9:1 against the surface for every category in both themes.
 */
export function CategoryPicker({
  value,
  onChange,
}: Readonly<{ value: CategoryKey; onChange: (c: CategoryKey) => void }>) {
  const stripRef = useRef<HTMLDivElement>(null);
  // Keep the chosen pill in view, e.g. when typing a description picks one off-screen.
  useEffect(() => {
    stripRef.current
      ?.querySelector<HTMLElement>("[data-pressed]")
      ?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
  }, [value]);
  return (
    <div className="flex flex-col gap-2">
      <span id="expense-category-label" className="text-[0.8125rem] font-bold text-text-2">
        Category
      </span>
      <ToggleGroup
        ref={stripRef}
        variant="outline"
        value={[value]}
        // Re-pressing the chosen pill arrives as an empty selection: treat it as
        // choosing that category again, which still marks the choice as the user's.
        onValueChange={(next) => onChange((next[0] as CategoryKey | undefined) ?? value)}
        aria-labelledby="expense-category-label"
        className="no-scrollbar -mx-5 w-auto gap-2 overflow-x-auto px-5 py-1"
      >
        {CATEGORY_LIST.map((c) => (
          <ToggleGroupItem
            key={c.key}
            value={c.key}
            style={{ "--cat": c.color } as React.CSSProperties}
            className="h-10 gap-1.5 rounded-full border-[1.5px] pr-3.5 pl-1.5 text-[0.8125rem] font-semibold text-text-2 data-pressed:border-2 data-pressed:border-[color-mix(in_srgb,var(--cat),var(--text)_30%)] data-pressed:bg-[color-mix(in_srgb,var(--cat)_12%,transparent)] data-pressed:font-bold data-pressed:text-text"
          >
            <CategoryIcon category={c.key} size={26} />
            {c.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
}
