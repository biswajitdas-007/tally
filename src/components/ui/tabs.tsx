"use client";

import { Tabs as TabsPrimitive } from "@base-ui/react/tabs";
import { cn } from "@/lib/utils";

/**
 * shadcn Tabs (base-nova, Base UI) in Tally tokens: a segmented track whose
 * active tab is a raised pill. Use for switching between panels of a view;
 * for picking a value, use Segmented (ToggleGroup) instead.
 */
function Tabs({ className, ...props }: TabsPrimitive.Root.Props) {
  return <TabsPrimitive.Root data-slot="tabs" className={cn("flex flex-col gap-4", className)} {...props} />;
}

function TabsList({ className, ...props }: TabsPrimitive.List.Props) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn("inline-flex items-center gap-0.5 rounded-[14px] bg-surface-inset p-0.5", className)}
      {...props}
    />
  );
}

function TabsTrigger({ className, ...props }: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-trigger"
      className={cn(
        "inline-flex h-10 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-[12px] px-3.5 text-[0.8125rem] font-semibold whitespace-nowrap text-text-2 transition-colors hover:text-text focus-visible:ring-4 focus-visible:ring-[color-mix(in_srgb,var(--ring)_28%,transparent)] disabled:pointer-events-none disabled:opacity-50 data-active:bg-surface data-active:text-text data-active:shadow-[var(--shadow-xs)] data-active:ring-1 data-active:ring-border [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    />
  );
}

function TabsContent({ className, ...props }: TabsPrimitive.Panel.Props) {
  return <TabsPrimitive.Panel data-slot="tabs-content" className={cn("rounded-[12px]", className)} {...props} />;
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
