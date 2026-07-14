import { cn } from "@/lib/utils";
import { CATEGORIES } from "@/lib/categories";
import type { CategoryKey } from "@/lib/types";

export function Chip({
  active,
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-[0.8125rem] font-medium transition-all",
        active
          ? "bg-brand text-on-brand shadow-[var(--shadow-xs)]"
          : "bg-surface-inset text-text-2 hover:bg-brand-soft hover:text-brand-on-soft",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

/** Tinted rounded-square icon tile for an expense category. */
export function CategoryIcon({
  category,
  size = 40,
  className,
}: {
  category: CategoryKey;
  size?: number;
  className?: string;
}) {
  const meta = CATEGORIES[category];
  const Icon = meta.icon;
  return (
    <div
      className={cn("inline-flex shrink-0 items-center justify-center rounded-[13px]", className)}
      style={{
        width: size,
        height: size,
        background: `color-mix(in srgb, ${meta.color} 15%, transparent)`,
        color: meta.color,
      }}
    >
      <Icon size={size * 0.5} strokeWidth={2} />
    </div>
  );
}

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: "neutral" | "positive" | "negative" | "brand" | "warning";
  className?: string;
  children: React.ReactNode;
}) {
  const tones = {
    neutral: "bg-surface-inset text-text-2",
    positive: "bg-positive-soft text-positive",
    negative: "bg-negative-soft text-negative",
    brand: "bg-brand-soft text-brand-on-soft",
    warning: "bg-warning-soft text-warning",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.7rem] font-semibold",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
