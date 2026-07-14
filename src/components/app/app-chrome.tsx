"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useStore } from "@/store/useStore";
import { isFirebaseConfigured } from "@/lib/firebase";
import { AppShell } from "./app-shell";
import { LoginScreen } from "./login-screen";
import { TallyMark } from "./logo";

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
      <motion.div
        className="h-1 w-24 overflow-hidden rounded-full bg-surface-inset"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <motion.div
          className="h-full w-1/2 rounded-full bg-brand"
          animate={{ x: ["-100%", "220%"] }}
          transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
        />
      </motion.div>
    </div>
  );
}

export function AppChrome({ children }: { children: React.ReactNode }) {
  // Gate on client mount so the first client render matches the server (Splash),
  // regardless of when the persisted store rehydrates.
  const [mounted, setMounted] = useState(false);
  const authReady = useStore((s) => s.authReady);
  const dataReady = useStore((s) => s.dataReady);
  const currentUserId = useStore((s) => s.currentUserId);

  useEffect(() => setMounted(true), []);

  // Wait for Firebase to resolve the session before deciding what to show,
  // so a returning user never flashes the login screen.
  const waitingForAuth = isFirebaseConfigured && !authReady;

  if (!mounted || waitingForAuth) return <Splash />;
  if (!currentUserId) return <LoginScreen />;
  if (!dataReady) return <Splash />; // loading data from the server
  return <AppShell>{children}</AppShell>;
}
