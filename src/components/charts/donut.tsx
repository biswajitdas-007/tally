"use client";

import { motion } from "framer-motion";

export interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

export function Donut({
  data,
  size = 176,
  stroke = 20,
  children,
}: {
  data: DonutSlice[];
  size?: number;
  stroke?: number;
  children?: React.ReactNode;
}) {
  const total = data.reduce((a, d) => a + d.value, 0) || 1;
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const c = 2 * Math.PI * r;
  const gap = 0.012 * c; // small breathing gap between slices

  let start = 0;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {data.map((d, i) => {
          const frac = d.value / total;
          const seg = Math.max(frac * c - gap, 0.001);
          const rotation = start * 360;
          start += frac;
          return (
            <g key={d.label} transform={`rotate(${rotation} ${cx} ${cx})`}>
              <motion.circle
                cx={cx}
                cy={cx}
                r={r}
                fill="none"
                stroke={d.color}
                strokeWidth={stroke}
                strokeLinecap="round"
                strokeDasharray={`${seg} ${c}`}
                initial={{ strokeDashoffset: seg }}
                animate={{ strokeDashoffset: 0 }}
                transition={{ duration: 0.7, delay: 0.08 * i, ease: [0.22, 1, 0.36, 1] }}
              />
            </g>
          );
        })}
      </svg>
      {children && <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>}
    </div>
  );
}
