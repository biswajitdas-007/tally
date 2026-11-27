"use client";

import { useCallback, useEffect, useState } from "react";

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
  const [lingering, setLingering] = useState(open);
  const [prevOpen, setPrevOpen] = useState(open);

  // Opening: start lingering in the same render (no effect, no extra frame).
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setLingering(true);
  }

  useEffect(() => {
    if (open) return;
    // Closing: give the animation a moment, but never wait forever.
    const timer = setTimeout(() => setLingering(false), EXIT_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [open]);

  const done = useCallback(() => setLingering(false), []);

  return [open || lingering, done];
}
