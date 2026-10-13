"use client";

import { useId } from "react";
import type { TrendPoint } from "@/types/hr";

const TICKS = [0, 25, 50, 75, 100];
const WIDTH = 560;
const HEIGHT = 220;
const PAD = { top: 14, right: 16, bottom: 26, left: 34 };
const PLOT_W = WIDTH - PAD.left - PAD.right;
const PLOT_H = HEIGHT - PAD.top - PAD.bottom;

interface LineTrendChartProps {
  data: TrendPoint[]; // values assumed 0-100 (percentage)
  unit?: string;
}

// A single-series percentage trend line: 2px line, subtle area wash, one
// end-label, hairline gridlines. No legend - one series names itself via
// the section title. See the dataviz skill's marks-and-anatomy reference.
export default function LineTrendChart({ data, unit = "%" }: LineTrendChartProps) {
  const gradientId = useId();
  if (data.length === 0) return null;

  const xFor = (i: number) =>
    PAD.left + (data.length === 1 ? 0 : (i * PLOT_W) / (data.length - 1));
  const yFor = (value: number) => PAD.top + PLOT_H * (1 - value / 100);

  const linePath = data
    .map((d, i) => `${i === 0 ? "M" : "L"} ${xFor(i)} ${yFor(d.value)}`)
    .join(" ");
  const areaPath = `${linePath} L ${xFor(data.length - 1)} ${PAD.top + PLOT_H} L ${xFor(0)} ${PAD.top + PLOT_H} Z`;

  const last = data[data.length - 1];
  const lastX = xFor(data.length - 1);
  const lastY = yFor(last.value);
  const labelAnchor = lastX > WIDTH - 60 ? "end" : "start";
  const labelX = labelAnchor === "end" ? lastX - 10 : lastX + 10;

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      width="100%"
      height={HEIGHT}
      role="img"
      aria-label={`Trend from ${data[0].label} to ${last.label}, ending at ${last.value}${unit}`}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-hr-accent)" stopOpacity="0.18" />
          <stop offset="100%" stopColor="var(--color-hr-accent)" stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {TICKS.map((t) => {
        const y = yFor(t);
        return (
          <g key={t}>
            <line
              x1={PAD.left}
              x2={WIDTH - PAD.right}
              y1={y}
              y2={y}
              stroke="var(--color-chart-grid)"
              strokeWidth={1}
            />
            <text
              x={PAD.left - 8}
              y={y}
              textAnchor="end"
              dominantBaseline="middle"
              fontSize={10}
              fill="var(--color-chart-muted)"
            >
              {t}
              {unit}
            </text>
          </g>
        );
      })}

      <path d={areaPath} fill={`url(#${gradientId})`} stroke="none" />
      <path
        d={linePath}
        fill="none"
        stroke="var(--color-hr-accent)"
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {data.map((d, i) => (
        <g key={d.label}>
          <circle
            cx={xFor(i)}
            cy={yFor(d.value)}
            r={10}
            fill="transparent"
            style={{ cursor: "default" }}
          >
            <title>{`${d.label}: ${d.value}${unit}`}</title>
          </circle>
          <text
            x={xFor(i)}
            y={HEIGHT - 8}
            textAnchor="middle"
            fontSize={10}
            fill="var(--color-chart-muted)"
          >
            {d.label}
          </text>
        </g>
      ))}

      <circle cx={lastX} cy={lastY} r={4} fill="var(--color-hr-accent)" stroke="var(--color-surface)" strokeWidth={2} />
      <text
        x={labelX}
        y={lastY - 10}
        textAnchor={labelAnchor}
        fontSize={12}
        fontWeight={600}
        fill="var(--color-text)"
      >
        {last.value}
        {unit}
      </text>
    </svg>
  );
}
