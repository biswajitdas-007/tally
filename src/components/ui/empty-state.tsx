import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="relative mb-5">
        <div className="absolute inset-0 -z-10 scale-150 rounded-full bg-brand-soft blur-xl opacity-60" />
        <div className="flex h-16 w-16 items-center justify-center rounded-[20px] border border-border bg-surface shadow-[var(--shadow-sm)]">
          <Icon className="h-7 w-7 text-brand" strokeWidth={1.75} />
        </div>
      </div>
      <h3 className="font-display text-lg font-semibold text-text">{title}</h3>
      <p className="mt-1.5 max-w-[15rem] text-sm leading-relaxed text-text-2">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
