"use client";

import { useLayoutEffect } from "react";

let locks = 0;
let savedY = 0;

/**
 * Freezes the page behind an overlay without losing the reader's place, for
 * as long as it is mounted.
 *
 * `overflow: hidden` on its own doesn't stop programmatic scrolling — so
 * autofocusing a field inside a sheet makes the browser scroll the document to
 * reveal it, and the page behind visibly jumps. Pinning the body and putting
 * the offset back on release holds the position exactly. Locks are counted, so
 * a sheet opened from another sheet doesn't release the page early.
 *
 * Render it *inside* an overlay's AnimatePresence subtree: it mounts when the
 * overlay opens and unmounts only once the exit animation has finished, so the
 * page stays pinned while the panel slides away. In a background tab, where
 * animations pause, the lock is held until the tab is visible and the exit
 * completes. It runs as a layout effect so it lands before Base UI's own
 * (deferred) modal lock, which then sees the page is pinned and stands aside.
 */
export function ScrollLock(): null {
  useLayoutEffect(() => {
    if (locks === 0) {
      savedY = window.scrollY;
      const { style } = document.body;
      style.position = "fixed";
      style.top = `-${savedY}px`;
      style.left = "0";
      style.right = "0";
      style.width = "100%";
      style.overflow = "hidden";
    }
    locks++;

    return () => {
      locks--;
      if (locks > 0) return;
      const { style } = document.body;
      style.position = "";
      style.top = "";
      style.left = "";
      style.right = "";
      style.width = "";
      style.overflow = "";
      window.scrollTo(0, savedY);
    };
  }, []);
  return null;
}
