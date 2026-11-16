"use client";

import { Chart as ChartJS, ArcElement, Tooltip } from "chart.js";
import { Doughnut } from "react-chartjs-2";
import { useChartTheme } from "@/components/hr/charts/useChartTheme";

ChartJS.register(ArcElement, Tooltip);

export interface LeaveTypeSlice {
  label: string;
  value: number; // days used, this type
}

interface LeaveByTypeChartProps {
  data: LeaveTypeSlice[];
  totalLabel: string;
}

// "Leave by Type" donut with a centered total and a side legend listing each
// slice's share - same doughnut shell as `StatusBreakdownChart`, but with
// its own in-canvas total (that chart's bottom legend doesn't fit this
// layout) and a percentage-labelled legend instead.
export default function LeaveByTypeChart({ data, totalLabel }: LeaveByTypeChartProps) {
  const theme = useChartTheme();
  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (data.length === 0 || total === 0) {
    return <p style={{ fontSize: 13, color: "var(--color-text-muted)" }}>No leave taken yet this period.</p>;
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
      <div style={{ position: "relative", width: 160, height: 160, flexShrink: 0 }}>
        <Doughnut
          data={{
            labels: data.map((d) => d.label),
            datasets: [
              {
                data: data.map((d) => d.value),
                backgroundColor: theme.series,
                borderColor: theme.surface,
                borderWidth: 2,
                hoverOffset: 4,
              },
            ],
          }}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            cutout: "70%",
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: {
                  label: (ctx) => {
                    const value = ctx.parsed as number;
                    const pct = Math.round((value / total) * 100);
                    return `${ctx.label}: ${value} day${value === 1 ? "" : "s"} (${pct}%)`;
                  },
                },
              },
            },
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
          }}
        >
          <span style={{ fontSize: 22, fontWeight: 700, color: "var(--color-text)" }}>{totalLabel}</span>
          <span style={{ fontSize: 11, color: "var(--color-text-muted)" }}>Total</span>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1, minWidth: 160 }}>
        {data.map((d, i) => (
          <div key={d.label} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5 }}>
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: 3,
                background: theme.series[i] ?? theme.muted,
                flexShrink: 0,
              }}
            />
            <span style={{ flex: 1, color: "var(--color-text)" }}>{d.label}</span>
            <span style={{ color: "var(--color-text-muted)", fontWeight: 600 }}>
              {Math.round((d.value / total) * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
