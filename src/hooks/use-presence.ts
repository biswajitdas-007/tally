"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Longest we'll wait for an exit animation before letting go anyway. Animations
 * don't run in a hidden tab, so onExitComplete may never arrive — and a page
 * left permanently scroll-locked is far worse than releasing a frame early.
 */
const EXIT_TIMEOUT_MS = 500;

/**
 * Treat a modal as still on screen until its exit animation has finished.
 *
 * Releasing a scroll lock the instant `open` flips to false unpins the page
 * while the panel is still sliding away, so the background jumps behind it.
 * Holding on until AnimatePresence says it's done keeps the close smooth.
 */
export function usePresence(open: boolean): [present: boolean, onExitComplete: () => void] {
  const [lingering, setLingering] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    if (open) {
      setLingering(true);
      return;
    }
    // Closing: give the animation a moment, but never wait forever.
    timer.current = setTimeout(() => setLingering(false), EXIT_TIMEOUT_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [open]);

  const done = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    setLingering(false);
  }, []);

  return [open || lingering, done];
}
