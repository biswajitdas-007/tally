"use client";

import { Switch as SwitchPrimitive } from "@base-ui/react/switch";
import { cn } from "@/lib/utils";

/**
 * shadcn Switch (base-nova, Base UI), sized for touch: 44×26 with a larger
 * invisible hit area. Controlled with `checked` / `onCheckedChange`.
 */
function Switch({
  className,
  size = "default",
  ...props
}: SwitchPrimitive.Root.Props & {
  size?: "sm" | "default";
}) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      className={cn(
        "peer group/switch relative inline-flex shrink-0 cursor-pointer items-center rounded-full border border-transparent p-0.5 transition-colors after:absolute after:-inset-x-2 after:-inset-y-2 focus-visible:ring-4 focus-visible:ring-[color-mix(in_srgb,var(--ring)_28%,transparent)] aria-invalid:border-destructive data-[size=default]:h-[26px] data-[size=default]:w-[44px] data-[size=sm]:h-5 data-[size=sm]:w-8 data-checked:bg-brand data-unchecked:bg-border-strong data-disabled:cursor-not-allowed data-disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="pointer-events-none block rounded-full bg-white shadow-[var(--shadow-sm)] ring-0 transition-transform duration-200 ease-[var(--ease-out)] group-data-[size=default]/switch:size-[20px] group-data-[size=sm]/switch:size-4 group-data-[size=default]/switch:data-checked:translate-x-[18px] group-data-[size=sm]/switch:data-checked:translate-x-3 data-unchecked:translate-x-0"
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
