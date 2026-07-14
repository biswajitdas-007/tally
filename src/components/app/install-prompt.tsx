"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Download, X } from "lucide-react";
import { TallyMark } from "./logo";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "tally-install-dismissed";

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(DISMISS_KEY)) return;
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setTimeout(() => setVisible(true), 2500);
    };
    window.addEventListener("beforeinstallprompt", onBip);
    return () => window.removeEventListener("beforeinstallprompt", onBip);
  }, []);

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    setVisible(false);
  }

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+80px)] z-40 mx-auto flex max-w-sm items-center gap-3 rounded-[18px] border border-border bg-surface p-3 shadow-[var(--shadow-lg)] md:inset-x-auto md:bottom-6 md:right-6"
        >
          <TallyMark size={40} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-text">Install Tally</p>
            <p className="text-[0.78rem] text-text-2">Add to your home screen for instant access.</p>
          </div>
          <Button size="sm" onClick={install}>
            <Download className="h-4 w-4" /> Install
          </Button>
          <button
            onClick={dismiss}
            aria-label="Dismiss"
            className="flex h-8 w-8 items-center justify-center rounded-full text-text-3 hover:bg-surface-inset"
          >
            <X className="h-4 w-4" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
