import { cn } from "@/lib/utils";
import { CATEGORIES } from "@/lib/categories";
import type { CategoryKey } from "@/lib/types";

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
      aria-hidden
      className={cn("inline-flex shrink-0 items-center justify-center", className)}
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.32),
        background: `color-mix(in srgb, ${meta.color} 15%, transparent)`,
        color: meta.color,
      }}
    >
      <Icon size={Math.round(size * 0.46)} strokeWidth={1.7} />
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
