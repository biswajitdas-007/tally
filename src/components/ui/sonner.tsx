"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";
import { CircleCheck, Info, Loader2, OctagonX, TriangleAlert } from "lucide-react";
import { useTheme } from "@/components/theme-provider";

/**
 * shadcn Sonner toaster, themed with Tally tokens and following the app's own
 * theme provider (not next-themes). Sits above the mobile bottom nav.
 */
function Toaster(props: ToasterProps) {
  const { resolved } = useTheme();

  return (
    <Sonner
      theme={resolved}
      position="bottom-center"
      visibleToasts={3}
      // Sonner's own mobile switch is at 600px; the bottom nav hides at 768px,
      // so both offsets follow --toast-bottom (set per breakpoint in globals.css).
      offset={{ bottom: "var(--toast-bottom)" }}
      mobileOffset={{ bottom: "var(--toast-bottom)" }}
      className="toaster group"
      icons={{
        success: <CircleCheck className="size-4 text-positive" />,
        info: <Info className="size-4 text-info" />,
        warning: <TriangleAlert className="size-4 text-warning" />,
        error: <OctagonX className="size-4 text-negative" />,
        loading: <Loader2 className="size-4 animate-spin text-text-2" />,
      }}
      style={
        {
          "--normal-bg": "var(--surface)",
          "--normal-text": "var(--text)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius-lg)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast:
            "font-sans !shadow-[var(--shadow-lg)] !gap-3 !py-3 !px-4 focus-visible:!outline-2 focus-visible:!outline-offset-2 focus-visible:!outline-[var(--ring)]",
          title: "!text-sm !font-medium",
          actionButton:
            "!h-8 !rounded-full !bg-brand-soft !px-3 !text-[0.8rem] !font-semibold !text-brand-on-soft hover:!bg-brand-soft-2 focus-visible:!outline-2 focus-visible:!outline-offset-2 focus-visible:!outline-[var(--ring)] focus-visible:!shadow-none",
        },
      }}
      {...props}
    />
  );
}

export { Toaster };
