"use client";

import { useEffect } from "react";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppChrome } from "@/components/app/app-chrome";
import { AuthListener } from "@/components/app/auth-listener";
import { SyncManager } from "@/components/app/sync-manager";

function ServiceWorkerRegistrar() {
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <TooltipProvider delay={250}>
        <ServiceWorkerRegistrar />
        <AuthListener />
        <SyncManager />
        <AppChrome>{children}</AppChrome>
        <Toaster />
      </TooltipProvider>
    </ThemeProvider>
  );
}
