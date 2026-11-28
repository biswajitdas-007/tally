"use client";

import { Moon, Sun } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Flips between light and dark (an explicit choice, so it overrides the system setting). */
export function ThemeToggle({ className }: Readonly<{ className?: string }>) {
  const { resolved, setChoice } = useTheme();
  const isDark = resolved === "dark";

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={() => setChoice(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={cn("overflow-hidden rounded-full", className)}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={isDark ? "moon" : "sun"}
          initial={{ y: 12, opacity: 0, rotate: -30 }}
          animate={{ y: 0, opacity: 1, rotate: 0 }}
          exit={{ y: -12, opacity: 0, rotate: 30 }}
          transition={{ duration: 0.2 }}
          className="flex"
        >
          {isDark ? (
            <Moon className="size-[18px]" strokeWidth={1.8} aria-hidden />
          ) : (
            <Sun className="size-[18px]" strokeWidth={1.8} aria-hidden />
          )}
        </motion.span>
      </AnimatePresence>
    </Button>
  );
}
