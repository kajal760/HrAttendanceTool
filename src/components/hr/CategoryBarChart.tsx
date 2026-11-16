"use client";

import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip } from "chart.js";
import { Bar } from "react-chartjs-2";
import type { CategoryCount } from "@/types/hr";
import { useChartTheme } from "./charts/useChartTheme";
import styles from "./CategoryBarChart.module.css";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

function niceMax(value: number): number {
  if (value <= 0) return 4;
  if (value <= 10) return Math.ceil(value / 2) * 2;
  if (value <= 50) return Math.ceil(value / 5) * 5;
  return Math.ceil(value / 10) * 10;
}

interface CategoryBarChartProps {
  data: CategoryCount[];
}

// A categorical bar chart, as Chart.js: each bar is its own category
// (identity), so each gets a fixed, validated hue from the theme's series
// palette rather than sharing one accent color - same slot-by-position rule
// as the SVG version this replaces. CategoryBarChartLegend below names every
// slot, so Chart.js's own legend stays off to avoid showing it twice.
export default function CategoryBarChart({ data }: CategoryBarChartProps) {
  const theme = useChartTheme();
  if (data.length === 0) return null;

  // Never cycle past slot 8 - a 9th category would collide with slot 1
  // under CVD. This chart only ever carries a handful of request types, so
  // in practice every bar gets its own slot; a muted fallback exists only
  // as a defensive floor, not an expected path.
  const colorFor = (i: number) => theme.series[i] ?? theme.muted;
  const max = niceMax(Math.max(...data.map((d) => d.value)));

  return (
    <div className={styles.chartBox}>
      <Bar
        data={{
          labels: data.map((d) => d.label),
          datasets: [
            {
              data: data.map((d) => d.value),
              backgroundColor: data.map((_, i) => colorFor(i)),
              borderRadius: 4,
              maxBarThickness: 28,
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
                label: (ctx) => `${ctx.label}: ${ctx.parsed.y}`,
              },
            },
          },
          scales: {
            y: {
              beginAtZero: true,
              max,
              ticks: { stepSize: max / 4, color: theme.muted, font: { size: 10 } },
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

// Names every slot by color - the dependable identity channel. The x-axis
// labels above supplement this, they don't replace it (a reader shouldn't
// have to color-match to know what's plotted).
export function CategoryBarChartLegend({ data }: CategoryBarChartProps) {
  const theme = useChartTheme();
  if (data.length < 2) return null;
  return (
    <div className={styles.legend}>
      {data.map((d, i) => (
        <span className={styles.legendItem} key={d.label}>
          <span className={styles.legendSwatch} style={{ background: theme.series[i] ?? theme.muted }} />
          {d.label}
        </span>
      ))}
    </div>
  );
}
