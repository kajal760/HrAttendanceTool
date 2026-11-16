"use client";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
} from "chart.js";
import { Line } from "react-chartjs-2";
import type { TrendPoint } from "@/types/hr";
import { useChartTheme } from "./charts/useChartTheme";
import styles from "./LineTrendChart.module.css";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip);

interface LineTrendChartProps {
  data: TrendPoint[]; // values assumed 0-100 (percentage)
  unit?: string;
}

// A single-series percentage trend line, as a Chart.js line chart: themed
// accent line/fill, hairline gridlines, and an interactive tooltip on every
// point rather than just a static end-label. No legend - one series names
// itself via the section title (see StatusBreakdownChart for the same
// theme bridge applied to a doughnut).
export default function LineTrendChart({ data, unit = "%" }: LineTrendChartProps) {
  const theme = useChartTheme();
  if (data.length === 0) return null;

  return (
    <div className={styles.chartBox}>
      <Line
        data={{
          labels: data.map((d) => d.label),
          datasets: [
            {
              data: data.map((d) => d.value),
              borderColor: theme.accent,
              backgroundColor: `${theme.accent}26`,
              fill: true,
              tension: 0.35,
              pointRadius: 3,
              pointHoverRadius: 5,
              pointBackgroundColor: theme.accent,
              pointBorderColor: theme.surface,
              pointBorderWidth: 2,
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
                label: (ctx) => `${ctx.parsed.y}${unit}`,
              },
            },
          },
          scales: {
            y: {
              min: 0,
              max: 100,
              ticks: {
                stepSize: 25,
                color: theme.muted,
                font: { size: 10 },
                callback: (value) => `${value}${unit}`,
              },
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
