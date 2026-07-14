"use client";

import { motion } from "framer-motion";
import { formatINR } from "@/lib/utils";

export interface Bar {
  label: string;
  value: number;
}

export function BarChart({
  data,
  height = 150,
  highlightLast = true,
}: {
  data: Bar[];
  height?: number;
  highlightLast?: boolean;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="flex items-end gap-2" style={{ height: height + 40 }}>
      {data.map((d, i) => {
        const isLast = i === data.length - 1;
        const active = highlightLast && isLast;
        const h = Math.max((d.value / max) * height, 4);
        return (
          <div key={d.label + i} className="group flex flex-1 flex-col items-center gap-2">
            <div className="flex items-end" style={{ height }}>
              <span className="mb-1 text-[0.7rem] font-semibold tabular-nums text-text-2 opacity-0 transition-opacity group-hover:opacity-100">
                {formatINR(d.value, { compact: true })}
              </span>
            </div>
            <div className="relative flex w-full items-end justify-center" style={{ height }}>
              <motion.div
                className="w-full max-w-[34px] rounded-t-[8px] rounded-b-[3px]"
                style={{
                  background: active
                    ? "linear-gradient(180deg, var(--brand), color-mix(in srgb, var(--brand) 70%, transparent))"
                    : "var(--surface-inset)",
                }}
                initial={{ height: 0 }}
                animate={{ height: h }}
                transition={{ duration: 0.6, delay: 0.05 * i, ease: [0.22, 1, 0.36, 1] }}
              />
              <div
                className="absolute -top-1 left-0 h-full w-full"
                style={{ pointerEvents: "none" }}
              />
            </div>
            <span className={`text-[0.7rem] font-medium ${active ? "text-text" : "text-text-3"}`}>
              {d.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
