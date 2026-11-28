"use client";

import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * shadcn Checkbox (base-nova, Base UI). Wrap it in a `<label>` with its text
 * so the whole row toggles it. Controlled with `checked` / `onCheckedChange`.
 */
function Checkbox({ className, ...props }: CheckboxPrimitive.Root.Props) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "relative flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-[6px] border-[1.5px] border-text-3 bg-surface text-on-brand transition-colors",
        "data-checked:border-brand data-checked:bg-brand aria-invalid:border-destructive data-disabled:cursor-not-allowed data-disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator data-slot="checkbox-indicator" className="flex data-unchecked:hidden">
        <Check className="size-3.5" strokeWidth={3} aria-hidden />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
