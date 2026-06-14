"use client";

import type { SparkPoint } from "@/lib/mock-data";

type MiniSparklineProps = {
  data: SparkPoint[];
  positive: boolean;
};

export function MiniSparkline({ data, positive }: MiniSparklineProps) {
  if (!data || data.length === 0) return null;

  const values = data.map((d) => d.v);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min === 0 ? 1 : max - min;

  const width = 64;
  const height = 24;
  const padding = 2;

  // Map values to coordinates
  const points = data.map((d, index) => {
    const x = padding + (index / (data.length - 1)) * (width - padding * 2);
    const y = padding + (1 - (d.v - min) / range) * (height - padding * 2);
    return { x, y };
  });

  const pathD = `M ${points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" L ")}`;

  // Area path starts at first point, goes to last point, drops to bottom, goes back to start at bottom, and closes.
  const areaD = `${pathD} L ${points[points.length - 1].x.toFixed(1)},${height} L ${points[0].x.toFixed(1)},${height} Z`;

  const color = positive ? "#10b981" : "#f43f5e";
  const gradientId = `spark-grad-${positive ? "pos" : "neg"}`;

  return (
    <svg width="100%" height="24" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="overflow-visible">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.25} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path
        d={areaD}
        fill={`url(#${gradientId})`}
        stroke="none"
      />
      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
