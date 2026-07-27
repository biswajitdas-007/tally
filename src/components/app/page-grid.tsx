import { cn } from "@/lib/utils";

/**
 * Two-column dashboard layout for wide screens.
 *
 * Below `xl` the columns use `display: contents`, so their children collapse
 * back into the single stacked flow phones and iPads already get — in source
 * order, with the same gap. The mobile design is untouched; only desktop
 * reflows. Split a page's sections at one point (everything before goes in the
 * first column, everything after in the second) to keep that order intact.
 */
export function PageGrid({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-col gap-6 xl:grid xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] xl:items-start xl:gap-x-7 xl:gap-y-6",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function PageCol({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("contents xl:flex xl:flex-col xl:gap-6", className)}>{children}</div>;
}
