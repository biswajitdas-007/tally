"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Info, TriangleAlert, Undo2 } from "lucide-react";
import { uid } from "@/lib/utils";

type Tone = "success" | "error" | "info";

interface ToastItem {
  id: string;
  message: string;
  tone: Tone;
  action?: { label: string; onClick: () => void };
}

interface ToastContextValue {
  toast: (opts: { message: string; tone?: Tone; action?: ToastItem["action"]; duration?: number }) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const icons = { success: Check, error: TriangleAlert, info: Info };
const accents: Record<Tone, string> = {
  success: "var(--positive)",
  error: "var(--negative)",
  info: "var(--info)",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const [mounted, setMounted] = useState(false);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => setMounted(true), []);

  const remove = useCallback((id: string) => {
    setItems((list) => list.filter((t) => t.id !== id));
    clearTimeout(timers.current[id]);
  }, []);

  const toast = useCallback<ToastContextValue["toast"]>(
    ({ message, tone = "success", action, duration = 4000 }) => {
      const id = uid("t_");
      setItems((list) => [...list.slice(-2), { id, message, tone, action }]);
      timers.current[id] = setTimeout(() => remove(id), duration);
    },
    [remove],
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {mounted &&
        createPortal(
          <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 px-4 pb-[calc(env(safe-area-inset-bottom)+84px)] md:pb-6">
            <AnimatePresence>
              {items.map((t) => {
                const Icon = icons[t.tone];
                return (
                  <motion.div
                    key={t.id}
                    layout
                    initial={{ opacity: 0, y: 24, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 12, scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    className="pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-[16px] border border-border bg-surface px-4 py-3 shadow-[var(--shadow-lg)]"
                  >
                    <span
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                      style={{ background: `color-mix(in srgb, ${accents[t.tone]} 16%, transparent)`, color: accents[t.tone] }}
                    >
                      <Icon className="h-4 w-4" strokeWidth={2.5} />
                    </span>
                    <p className="flex-1 text-sm font-medium text-text">{t.message}</p>
                    {t.action && (
                      <button
                        onClick={() => {
                          t.action!.onClick();
                          remove(t.id);
                        }}
                        className="flex shrink-0 items-center gap-1 rounded-full bg-brand-soft px-3 py-1 text-[0.8rem] font-semibold text-brand-on-soft transition-colors hover:bg-brand-soft-2"
                      >
                        <Undo2 className="h-3.5 w-3.5" />
                        {t.action.label}
                      </button>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>,
          document.body,
        )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
