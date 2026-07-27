import { cn } from "@/lib/utils";

/**
 * Two-column dashboard layout for wide screens.
 *
 * Uses CSS multi-column rather than a grid: the browser balances the two
 * columns to equal height, so a page never ends with one column running out
 * early and leaving dead space beside the other. Cards opt out of splitting
 * with `break-inside: avoid`, so each one stays whole.
 *
 * Below `xl` this is a plain stacked flex column — the same single-column
 * layout phones and iPads already get, in source order.
 */
export function PageGrid({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("flex flex-col gap-6 xl:block xl:columns-2 xl:gap-7", className)}>{children}</div>;
}

/**
 * Groups sections within a PageGrid. It never draws a box of its own
 * (`display: contents`), so its children flow straight into the balanced
 * columns — the grouping is only there to keep the page source readable.
 */
export function PageCol({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("contents xl:[&>*]:mb-6 xl:[&>*]:break-inside-avoid", className)}>{children}</div>
  );
}
