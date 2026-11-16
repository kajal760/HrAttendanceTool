"use client";

import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip } from "chart.js";
import { Bar } from "react-chartjs-2";
import { useChartTheme } from "./charts/useChartTheme";
import styles from "./CategoryBarChart.module.css";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

function niceMax(value: number): number {
  if (value <= 0) return 4;
  if (value <= 10) return Math.ceil(value / 2) * 2;
  if (value <= 50) return Math.ceil(value / 5) * 5;
  return Math.ceil(value / 10) * 10;
}

export interface StackedBarPoint {
  label: string;
  a: number;
  b: number;
}

interface StackedTrendBarChartProps {
  data: StackedBarPoint[];
  aLabel: string;
  bLabel: string;
}

// Two-segment stacked monthly bars with a dot-legend underneath - the
// "Days of the week in office" shape, generalized to any two-part total
// (e.g. Approved + the rest of what was Applied).
export default function StackedTrendBarChart({ data, aLabel, bLabel }: StackedTrendBarChartProps) {
  const theme = useChartTheme();
  if (data.length === 0) return null;
  const max = niceMax(Math.max(...data.map((d) => d.a + d.b)));
  const colorA = theme.series[0] ?? theme.accent;
  const colorB = theme.series[6] ?? theme.accent;

  return (
    <div>
      <div style={{ height: 220 }}>
        <Bar
          data={{
            labels: data.map((d) => d.label),
            datasets: [
              {
                label: bLabel,
                data: data.map((d) => d.b),
                backgroundColor: colorB,
                borderRadius: { topLeft: 0, topRight: 0, bottomLeft: 4, bottomRight: 4 },
                maxBarThickness: 32,
                stack: "total",
              },
              {
                label: aLabel,
                data: data.map((d) => d.a),
                backgroundColor: colorA,
                borderRadius: { topLeft: 4, topRight: 4, bottomLeft: 0, bottomRight: 0 },
                maxBarThickness: 32,
                stack: "total",
              },
            ],
          }}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              y: {
                stacked: true,
                beginAtZero: true,
                max,
                ticks: { stepSize: max / 4, color: theme.muted, font: { size: 10 }, precision: 0 },
                grid: { color: theme.grid },
                border: { display: false },
              },
              x: {
                stacked: true,
                ticks: { color: theme.muted, font: { size: 10 } },
                grid: { display: false },
                border: { display: false },
              },
            },
          }}
        />
      </div>
      <div className={styles.legend}>
        <span className={styles.legendItem}>
          <span className={styles.legendSwatch} style={{ background: colorA }} />
          {aLabel}
        </span>
        <span className={styles.legendItem}>
          <span className={styles.legendSwatch} style={{ background: colorB }} />
          {bLabel}
        </span>
      </div>
    </div>
  );
}
