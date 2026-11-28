"use client";

import { toast as sonner } from "sonner";
import { Undo2 } from "lucide-react";

type Tone = "success" | "error" | "info";

export interface ToastOptions {
  message: string;
  tone?: Tone;
  /** One quick action, e.g. Undo. The toast closes when it's pressed. */
  action?: { label: string; onClick: () => void };
  duration?: number;
}

const show = { success: sonner.success, error: sonner.error, info: sonner.info } as const;

/** Shows a toast through Sonner (rendered by <Toaster /> in the app providers). */
export function showToast({ message, tone = "success", action, duration = 4000 }: ToastOptions) {
  return show[tone](message, {
    duration,
    action: action && {
      label: (
        <span className="inline-flex items-center gap-1">
          <Undo2 aria-hidden className="size-3.5" />
          {action.label}
        </span>
      ),
      onClick: action.onClick,
    },
  });
}

const api = { toast: showToast };

/** Same API the app has always used: `const { toast } = useToast(); toast({ message })`. */
export function useToast() {
  return api;
}
