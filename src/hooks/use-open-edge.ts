"use client";

import { useState } from "react";

/**
 * Runs `onOpen` during render on the render where `open` flips from false to true.
 *
 * This is React's "adjust state when a prop changes" pattern: resetting a form
 * here (instead of in an effect) avoids rendering stale values for a frame.
 * `onOpen` may only set state on the calling component.
 */
export function useOpenEdge(open: boolean, onOpen: () => void): void {
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) onOpen();
  }
}
