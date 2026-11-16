"use client";

import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip } from "chart.js";
import { Bar } from "react-chartjs-2";
import type { LeaveRequest } from "@/types/employee";
import { useChartTheme } from "@/components/hr/charts/useChartTheme";
import styles from "./LeaveHistoryChart.module.css";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

const MONTHS_BACK = 6;

interface LeaveHistoryChartProps {
  requests: LeaveRequest[];
}

// Approved leave days per month, last 6 months - the graph view of leave
// history on the combined Attendance & Leave page's Leave tab (toggled
// against the existing LeaveHistoryList table by LeaveHistorySection).
export default function LeaveHistoryChart({ requests }: LeaveHistoryChartProps) {
  const theme = useChartTheme();

  const now = new Date();
  const buckets: { key: string; label: string; days: number }[] = [];
  for (let i = MONTHS_BACK - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: d.toLocaleDateString(undefined, { month: "short" }),
      days: 0,
    });
  }
  const byKey = new Map(buckets.map((b) => [b.key, b]));
  for (const r of requests) {
    if (r.status !== "Approved") continue;
    const bucket = byKey.get(r.startDate.slice(0, 7));
    if (bucket) bucket.days += r.days;
  }

  return (
    <div className={styles.chartBox}>
      <Bar
        data={{
          labels: buckets.map((b) => b.label),
          datasets: [
            {
              label: "Days taken",
              data: buckets.map((b) => b.days),
              backgroundColor: theme.accent,
              borderRadius: 4,
              maxBarThickness: 30,
            },
          ],
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx) => `${ctx.parsed.y} day${ctx.parsed.y === 1 ? "" : "s"}`,
              },
            },
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: { precision: 0, color: theme.muted, font: { size: 10 } },
              grid: { color: theme.grid },
              border: { display: false },
            },
            x: {
              ticks: { color: theme.muted, font: { size: 10 } },
              grid: { display: false },
              border: { display: false },
            },
          },
        }}
      />
    </div>
  );
}
