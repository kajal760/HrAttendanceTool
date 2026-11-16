"use client";

import { Chart as ChartJS, ArcElement, Tooltip } from "chart.js";
import { Doughnut } from "react-chartjs-2";
import { useChartTheme } from "@/components/hr/charts/useChartTheme";

ChartJS.register(ArcElement, Tooltip);

export interface AssetStatusSlice {
  label: string;
  value: number;
  color: string; // fixed per-status tone, not the categorical series palette -
  // lifecycle status is a reserved-meaning channel (good/attention/bad), the
  // same convention `ATTENDANCE_TONE` and badge tones use elsewhere.
}

interface AssetStatusDonutProps {
  data: AssetStatusSlice[];
}

// "Asset Status Overview" donut with a centered total and a side legend -
// same shell as the Leave module's `LeaveByTypeChart`, but with caller-
// supplied slice colors instead of the chart theme's auto-assigned series,
// since a lifecycle status (Available/Assigned/Maintenance/Damaged) carries
// fixed meaning rather than being an arbitrary category.
export default function AssetStatusDonut({ data }: AssetStatusDonutProps) {
  const theme = useChartTheme();
  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (total === 0) {
    return <p style={{ fontSize: 13, color: "var(--color-text-muted)" }}>No assets recorded yet.</p>;
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
      <div style={{ position: "relative", width: 170, height: 170, flexShrink: 0 }}>
        <Doughnut
          data={{
            labels: data.map((d) => d.label),
            datasets: [
              {
                data: data.map((d) => d.value),
                backgroundColor: data.map((d) => d.color),
                borderColor: theme.surface,
                borderWidth: 2,
                hoverOffset: 4,
              },
            ],
          }}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            cutout: "68%",
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: {
                  label: (ctx) => {
                    const value = ctx.parsed as number;
                    const pct = Math.round((value / total) * 100);
                    return `${ctx.label}: ${value} (${pct}%)`;
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
          <span style={{ fontSize: 24, fontWeight: 700, color: "var(--color-text)" }}>{total}</span>
          <span style={{ fontSize: 11, color: "var(--color-text-muted)" }}>Total</span>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1, minWidth: 170 }}>
        {data.map((d) => (
          <div key={d.label} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: d.color, flexShrink: 0 }} />
            <span style={{ flex: 1, color: "var(--color-text)" }}>{d.label}</span>
            <span style={{ color: "var(--color-text-muted)", fontWeight: 600 }}>
              {d.value} ({total > 0 ? Math.round((d.value / total) * 100) : 0}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
