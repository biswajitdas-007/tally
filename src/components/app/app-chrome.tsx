"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { useStore } from "@/store/useStore";
import { isFirebaseConfigured } from "@/lib/firebase";
import { AppShell } from "./app-shell";
import { LoginScreen } from "./login-screen";
import { TallyMark } from "./logo";
import { Button } from "@/components/ui/button";

function Splash() {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center gap-5 bg-bg">
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
      >
        <TallyMark size={64} />
      </motion.div>
      <motion.div className="h-1 w-24 overflow-hidden rounded-full bg-surface-inset" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <motion.div
          className="h-full w-1/2 rounded-full bg-brand"
          animate={{ x: ["-100%", "220%"] }}
          transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
        />
      </motion.div>
    </div>
  );
}

function LoadError() {
  const refetch = useStore((s) => s.refetch);
  const setLoadError = useStore((s) => s.setLoadError);
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center gap-5 bg-bg px-6 text-center">
      <TallyMark size={52} />
      <div>
        <h1 className="font-display text-lg font-bold text-text">Couldn&apos;t reach the server</h1>
        <p className="mt-1 max-w-xs text-sm text-text-2">
          Check your connection and try again — your data is safe on the server.
        </p>
      </div>
      <Button
        onClick={() => {
          setLoadError(false);
          refetch();
        }}
      >
        Try again
      </Button>
    </div>
  );
}

export function AppChrome({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const authReady = useStore((s) => s.authReady);
  const dataReady = useStore((s) => s.dataReady);
  const loadError = useStore((s) => s.loadError);
  const currentUserId = useStore((s) => s.currentUserId);

  useEffect(() => setMounted(true), []);

  if (!mounted) return <Splash />;

  // The join flow renders its own sign-in UI, outside the app shell/gate.
  if (pathname?.startsWith("/join")) return <>{children}</>;

  const waitingForAuth = isFirebaseConfigured && !authReady;
  if (waitingForAuth) return <Splash />;
  if (!currentUserId) return <LoginScreen />;
  if (loadError) return <LoadError />;
  if (!dataReady) return <Splash />; // loading data from the server
  return <AppShell>{children}</AppShell>;
}
