"use client";

import { useEffect } from "react";

let locks = 0;
let savedY = 0;

/**
 * Freeze the page behind a modal without losing the reader's place.
 *
 * `overflow: hidden` on its own doesn't stop programmatic scrolling — so
 * autofocusing a field inside a sheet makes the browser scroll the document to
 * reveal it, and the page behind visibly jumps. Pinning the body and putting
 * the offset back on close holds the position exactly.
 *
 * Locks are counted, so a sheet opened from another sheet doesn't release the
 * page early.
 */
export function useScrollLock(active: boolean): void {
  useEffect(() => {
    if (!active) return;

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
  }, [active]);
}
