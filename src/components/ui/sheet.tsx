"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsDesktop } from "@/hooks/use-media-query";

export function Sheet({
  open,
  onClose,
  children,
  title,
  description,
  className,
  dismissable = true,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  description?: string;
  className?: string;
  dismissable?: boolean;
}) {
  const [mounted, setMounted] = useState(false);
  const isDesktop = useIsDesktop();

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && dismissable && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose, dismissable]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex justify-center md:items-center" role="dialog" aria-modal="true" aria-label={title}>
          <motion.div
            className="absolute inset-0"
            style={{ background: "var(--scrim)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            onClick={() => dismissable && onClose()}
          />
          <motion.div
            className={cn(
              // Cap height against the top safe-area inset so the sheet (and its
              // close button) never rides up under the notch / status bar.
              "relative mt-auto flex w-full max-h-[calc(100dvh-max(env(safe-area-inset-top),20px))] flex-col overflow-hidden border border-border bg-surface shadow-[var(--shadow-lg)]",
              "rounded-t-[26px] md:mt-0 md:max-h-[88vh] md:max-w-[440px] md:rounded-[24px]",
              className,
            )}
            initial={isDesktop ? { opacity: 0, scale: 0.96, y: 8 } : { y: "100%" }}
            animate={isDesktop ? { opacity: 1, scale: 1, y: 0 } : { y: 0 }}
            exit={isDesktop ? { opacity: 0, scale: 0.97, y: 8 } : { y: "100%" }}
            transition={{ type: "spring", stiffness: 340, damping: 34, mass: 0.9 }}
            drag={isDesktop || !dismissable ? false : "y"}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 120 || info.velocity.y > 600) onClose();
            }}
          >
            {!isDesktop && dismissable && (
              <div className="flex justify-center pt-2.5">
                <div className="h-1.5 w-10 rounded-full bg-border-strong" />
              </div>
            )}
            {(title || dismissable) && (
              <div className="flex items-start justify-between gap-3 px-5 pb-1 pt-3.5">
                <div className="min-w-0">
                  {title && <h2 className="font-display text-xl font-semibold text-text">{title}</h2>}
                  {description && <p className="mt-0.5 text-sm text-text-2">{description}</p>}
                </div>
                {dismissable && (
                  <button
                    onClick={onClose}
                    aria-label="Close"
                    className="-mr-1 -mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-text-3 transition-colors hover:bg-surface-inset hover:text-text"
                  >
                    <X className="h-5 w-5" />
                  </button>
                )}
              </div>
            )}
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-[max(env(safe-area-inset-bottom),20px)] pt-2">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
