"use client";

import { useEffect } from "react";
import { usePush } from "@/hooks/use-push";

/** Silently re-subscribes users who have already granted permission. */
export function PushAutoEnable() {
  const { supported, enable } = usePush();

  useEffect(() => {
    if (!supported || typeof Notification === "undefined") return;
    if (Notification.permission === "granted") enable();
  }, [supported, enable]);

  return null;
}
