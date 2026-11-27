"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore } from "react";
import { useMounted } from "@/hooks/use-mounted";

export type ThemeChoice = "light" | "dark" | "system";
const STORAGE_KEY = "tally-theme";
const DARK_QUERY = "(prefers-color-scheme: dark)";

interface ThemeContextValue {
  choice: ThemeChoice;
  resolved: "light" | "dark";
  setChoice: (c: ThemeChoice) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/** Inline script that runs before first paint to avoid a flash of wrong theme. */
export const themeScript = `(function(){try{var t=localStorage.getItem('${STORAGE_KEY}')||'system';var m=window.matchMedia('${DARK_QUERY}').matches;var d=t==='dark'||(t==='system'&&m);var r=document.documentElement;r.setAttribute('data-theme',d?'dark':'light');r.style.colorScheme=d?'dark':'light';}catch(e){}})();`;

function isThemeChoice(v: unknown): v is ThemeChoice {
  return v === "light" || v === "dark" || v === "system";
}

/* ---------- stored choice (localStorage), shared across tabs ---------- */

const choiceListeners = new Set<() => void>();
/** Set only when saving to localStorage failed, so the choice still holds for this session. */
let unsavedChoice: ThemeChoice | null = null;

function readChoice(): ThemeChoice {
  if (unsavedChoice) return unsavedChoice;
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return isThemeChoice(v) ? v : "system";
  } catch {
    return "system";
  }
}

function subscribeChoice(cb: () => void) {
  choiceListeners.add(cb);
  const onStorage = (e: StorageEvent) => e.key === STORAGE_KEY && cb();
  window.addEventListener("storage", onStorage);
  return () => {
    choiceListeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

function writeChoice(c: ThemeChoice) {
  try {
    localStorage.setItem(STORAGE_KEY, c);
    unsavedChoice = null;
  } catch {
    // Storage unavailable (blocked or full): keep the choice in memory instead.
    unsavedChoice = c;
  }
  choiceListeners.forEach((cb) => cb());
}

/* ---------- OS dark preference, ignoring the flip some browsers do while printing ---------- */

let systemDark = false;
let printing = false;

function subscribeSystem(cb: () => void) {
  const mq = window.matchMedia(DARK_QUERY);
  systemDark = mq.matches;
  const sync = () => {
    if (printing) return;
    systemDark = mq.matches;
    cb();
  };
  const onBeforePrint = () => {
    printing = true;
  };
  const onAfterPrint = () => {
    printing = false;
    sync();
  };
  mq.addEventListener("change", sync);
  window.addEventListener("beforeprint", onBeforePrint);
  window.addEventListener("afterprint", onAfterPrint);
  return () => {
    mq.removeEventListener("change", sync);
    window.removeEventListener("beforeprint", onBeforePrint);
    window.removeEventListener("afterprint", onAfterPrint);
  };
}

function readSystemDark() {
  if (!printing) systemDark = window.matchMedia(DARK_QUERY).matches;
  return systemDark;
}

function applyTheme(resolved: "light" | "dark") {
  const root = document.documentElement;
  root.dataset.theme = resolved;
  root.style.colorScheme = resolved;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const choice = useSyncExternalStore(subscribeChoice, readChoice, () => "system" as const);
  const prefersDark = useSyncExternalStore(subscribeSystem, readSystemDark, () => false);
  const resolved: "light" | "dark" = choice === "dark" || (choice === "system" && prefersDark) ? "dark" : "light";

  // Keep the <html> attributes (set first by themeScript) in sync with React. Skip the
  // hydration pass, where the server snapshots would briefly overwrite the script's value.
  const mounted = useMounted();
  useEffect(() => {
    if (mounted) applyTheme(resolved);
  }, [mounted, resolved]);

  const setChoice = useCallback((c: ThemeChoice) => writeChoice(c), []);
  const value = useMemo(() => ({ choice, resolved, setChoice }), [choice, resolved, setChoice]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
