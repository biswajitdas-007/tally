"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BellRing, X } from "lucide-react";
import { usePush } from "@/hooks/use-push";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";

/** A floating card nudging the user to turn notifications on when they're off. */
export function NotificationPrompt() {
  const { supported, enabled, busy, enable } = usePush();
  const { toast } = useToast();
  const [dismissed, setDismissed] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 1500);
    return () => clearTimeout(t);
  }, []);

  const blocked = typeof Notification !== "undefined" && Notification.permission === "denied";
  const show = ready && supported && !enabled && !dismissed;

  async function handleEnable() {
    if (blocked) {
      toast({ message: "Notifications are blocked — turn them on in your browser settings", tone: "info" });
      return;
    }
    const ok = await enable();
    toast(
      ok
        ? { message: "Notifications on 🔔" }
        : { message: "Couldn't enable — check your browser settings", tone: "error" },
    );
  }

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ type: "spring", stiffness: 360, damping: 30 }}
          className="fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+80px)] z-40 mx-auto flex max-w-sm items-center gap-3 overflow-hidden rounded-[18px] border border-border bg-surface p-3 shadow-[var(--shadow-lg)] md:inset-x-auto md:bottom-6 md:right-6"
        >
          <div className="pointer-events-none absolute -right-6 -top-8 h-24 w-24 rounded-full bg-brand-soft opacity-60 blur-2xl" />
          <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-brand text-on-brand">
            <BellRing className="h-5 w-5" />
          </div>
          <div className="relative min-w-0 flex-1">
            <p className="text-sm font-semibold text-text">Never miss a settle-up</p>
            <p className="text-[0.78rem] leading-snug text-text-2">
              Get notified when friends add expenses or pay you back.
            </p>
          </div>
          <Button size="sm" loading={busy} onClick={handleEnable} className="relative shrink-0">
            Enable
          </Button>
          <button
            onClick={() => setDismissed(true)}
            aria-label="Dismiss"
            className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-text-3 hover:bg-surface-inset"
          >
            <X className="h-4 w-4" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
