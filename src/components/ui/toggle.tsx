"use client";

import { Toggle as TogglePrimitive } from "@base-ui/react/toggle";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/** shadcn Toggle (base-nova, Base UI) in Tally tokens. */
const toggleVariants = cva(
  "group/toggle inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-[12px] text-sm font-semibold whitespace-nowrap text-text-2 transition-colors hover:text-text focus-visible:ring-4 focus-visible:ring-[color-mix(in_srgb,var(--ring)_28%,transparent)] disabled:pointer-events-none disabled:opacity-50 data-pressed:text-text [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-transparent hover:bg-surface-inset data-pressed:bg-surface-inset",
        outline: "border border-border bg-surface hover:bg-surface-2 data-pressed:border-border-strong data-pressed:bg-surface-2",
        /** A pill inside a sunken track — the segmented-control look. */
        segment:
          "bg-transparent data-pressed:bg-surface data-pressed:shadow-[var(--shadow-xs)] data-pressed:ring-1 data-pressed:ring-border",
      },
      size: {
        default: "h-10 min-w-10 px-3.5",
        sm: "h-8 min-w-8 px-3 text-[0.8125rem]",
        lg: "h-11 min-w-11 px-4",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Toggle({
  className,
  variant = "default",
  size = "default",
  ...props
}: TogglePrimitive.Props & VariantProps<typeof toggleVariants>) {
  return <TogglePrimitive data-slot="toggle" className={cn(toggleVariants({ variant, size, className }))} {...props} />;
}

export { Toggle, toggleVariants };
