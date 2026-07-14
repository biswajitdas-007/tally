"use client";

import { useEffect } from "react";
import { usePush } from "@/hooks/use-push";

const ASKED_KEY = "tally-push-asked";

/**
 * Turns notifications on with as little friction as the browser allows:
 * - already granted → subscribe silently on load
 * - not yet asked → prompt on the user's first tap (a gesture, required by iOS)
 * - denied → do nothing
 */
export function PushAutoEnable() {
  const { supported, enable } = usePush();

  useEffect(() => {
    if (!supported || typeof Notification === "undefined") return;

    if (Notification.permission === "granted") {
      enable();
      return;
    }
    if (Notification.permission === "denied") return;
    if (localStorage.getItem(ASKED_KEY)) return;

    const onFirstGesture = () => {
      localStorage.setItem(ASKED_KEY, "1");
      enable();
    };
    document.addEventListener("pointerdown", onFirstGesture, { once: true });
    return () => document.removeEventListener("pointerdown", onFirstGesture);
  }, [supported, enable]);

  return null;
}
