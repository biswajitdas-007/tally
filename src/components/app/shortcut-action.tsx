"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useStore } from "@/store/useStore";

/**
 * Runs what an installed-app shortcut asked for (`/?action=add|settle`). Waits
 * for the user's data so "Settle up" sees real balances on a cold start, runs
 * once, then drops the parameter so a refresh doesn't repeat it.
 */
export function ShortcutAction({ onAdd, onSettle }: { onAdd: () => void; onSettle: () => void }) {
  const action = useSearchParams().get("action");
  const router = useRouter();
  const dataReady = useStore((s) => s.dataReady);
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current || !dataReady || (action !== "add" && action !== "settle")) return;
    handled.current = true;
    if (action === "add") onAdd();
    else onSettle();
    router.replace("/", { scroll: false });
  }, [action, dataReady, onAdd, onSettle, router]);

  return null;
}
