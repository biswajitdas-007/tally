"use client";

import { useRef } from "react";
import { motion, useMotionValue, useTransform } from "framer-motion";
import { Trash2 } from "lucide-react";
import { useMediaQuery } from "@/hooks/use-media-query";

/** Wraps a row; on touch devices, swipe left past the threshold to delete. */
export function SwipeRow({
  children,
  onDelete,
  className,
}: {
  children: React.ReactNode;
  onDelete: () => void;
  className?: string;
}) {
  const canSwipe = useMediaQuery("(pointer: coarse)");
  const x = useMotionValue(0);
  const revealed = useRef(false);
  const iconOpacity = useTransform(x, [-80, -30], [1, 0]);
  const iconScale = useTransform(x, [-80, -40], [1, 0.6]);

  if (!canSwipe) return <div className={className}>{children}</div>;

  return (
    <div className={`relative overflow-hidden ${className ?? ""}`}>
      <div className="absolute inset-y-0 right-0 flex items-center justify-end bg-negative pr-5" style={{ width: "100%" }}>
        <motion.span style={{ opacity: iconOpacity, scale: iconScale }} className="text-white">
          <Trash2 className="h-5 w-5" />
        </motion.span>
      </div>
      <motion.div
        drag="x"
        style={{ x }}
        dragConstraints={{ left: -96, right: 0 }}
        dragElastic={{ left: 0.4, right: 0 }}
        dragDirectionLock
        onDragEnd={(_, info) => {
          if (info.offset.x < -72 || info.velocity.x < -500) {
            revealed.current = true;
            onDelete();
          }
        }}
        className="relative bg-surface"
      >
        {children}
      </motion.div>
    </div>
  );
}
