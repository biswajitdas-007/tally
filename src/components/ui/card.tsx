import { cn } from "@/lib/utils";

export function Card({
  className,
  interactive,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { interactive?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-lg)] border border-border bg-surface shadow-[var(--shadow-sm)]",
        interactive &&
          "cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:border-border-strong hover:shadow-[var(--shadow-md)] active:translate-y-0",
        className,
      )}
      {...props}
    />
  );
}

export function SectionHeader({
  title,
  action,
  className,
}: {
  title: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-3 flex items-center justify-between px-1", className)}>
      <h2 className="text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-text-3">{title}</h2>
      {action}
    </div>
  );
}
