"use client";

import { useEffect } from "react";
import { animate, motion, useMotionValue, useTransform, useReducedMotion } from "framer-motion";
import { formatINR } from "@/lib/utils";

export function AnimatedAmount({
  value,
  decimals = false,
  compact = false,
  className,
}: {
  value: number;
  decimals?: boolean;
  compact?: boolean;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const mv = useMotionValue(value);
  const text = useTransform(mv, (v) => formatINR(v, { decimals, compact }));

  useEffect(() => {
    if (reduce) {
      mv.set(value);
      return;
    }
    const controls = animate(mv, value, { duration: 0.85, ease: [0.22, 1, 0.36, 1] });
    return () => controls.stop();
  }, [value, mv, reduce]);

  return <motion.span className={className}>{text}</motion.span>;
}
