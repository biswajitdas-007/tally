import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * shadcn Button (base-nova, Base UI primitive) with Tally's variants and sizes.
 * To make a link look like a button, style the link itself with
 * `buttonVariants()` so it keeps link semantics for screen readers.
 */
export const buttonVariants = cva(
  "relative inline-flex cursor-pointer select-none items-center justify-center font-semibold tracking-[-0.01em] whitespace-nowrap transition-all active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 data-disabled:pointer-events-none data-disabled:opacity-50 focus-visible:ring-4 focus-visible:ring-[color-mix(in_srgb,var(--brand)_28%,transparent)] [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-brand text-on-brand shadow-[var(--shadow-brand)] hover:bg-brand-hover",
        primary: "bg-brand text-on-brand shadow-[var(--shadow-brand)] hover:bg-brand-hover",
        soft: "bg-brand-soft text-brand-on-soft hover:bg-brand-soft-2",
        secondary:
          "bg-surface text-text border border-border shadow-[var(--shadow-xs)] hover:bg-surface-2 hover:border-border-strong",
        outline:
          "bg-surface text-text border border-border shadow-[var(--shadow-xs)] hover:bg-surface-2 hover:border-border-strong",
        ghost: "text-text-2 hover:bg-surface-inset hover:text-text",
        destructive: "bg-negative text-destructive-foreground shadow-[var(--shadow-sm)] hover:brightness-105",
        dangerSoft: "bg-negative-soft text-negative hover:brightness-105",
        brass: "bg-brass-soft text-brass-on-soft hover:brightness-[0.98]",
        link: "text-brand underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-9 gap-1.5 rounded-[12px] px-3.5 text-[0.8125rem]",
        default: "h-11 gap-2 rounded-[14px] px-[18px] text-sm",
        md: "h-11 gap-2 rounded-[14px] px-[18px] text-sm",
        lg: "h-[52px] gap-2 rounded-[16px] px-6 text-[0.95rem]",
        icon: "h-10 w-10 rounded-[13px]",
        "icon-sm": "h-9 w-9 rounded-[12px]",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends Omit<ButtonPrimitive.Props, "className">,
    VariantProps<typeof buttonVariants> {
  className?: string;
  /** Shows a spinner and disables the button while an action is in flight. */
  loading?: boolean;
  fullWidth?: boolean;
}

export function Button({ className, variant, size, loading, fullWidth, disabled, children, ...props }: ButtonProps) {
  return (
    <ButtonPrimitive
      data-slot="button"
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(buttonVariants({ variant, size }), fullWidth && "w-full", className)}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </ButtonPrimitive>
  );
}
