"use client";

import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip } from "chart.js";
import { Bar } from "react-chartjs-2";
import { useChartTheme } from "./charts/useChartTheme";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

function niceMax(value: number): number {
  if (value <= 0) return 4;
  if (value <= 10) return Math.ceil(value / 2) * 2;
  if (value <= 50) return Math.ceil(value / 5) * 5;
  return Math.ceil(value / 10) * 10;
}

export interface MonthlyCountPoint {
  label: string;
  value: number;
}

interface EmployeeGrowthChartProps {
  data: MonthlyCountPoint[];
}

// New joiners per month - single accent-colored series (unlike
// CategoryBarChart, every bar is the same metric over time, not a distinct
// category, so it shouldn't carry a different identity color per bar).
export default function EmployeeGrowthChart({ data }: EmployeeGrowthChartProps) {
  const theme = useChartTheme();
  if (data.length === 0) return null;
  const max = niceMax(Math.max(...data.map((d) => d.value)));

  return (
    <div style={{ height: 220 }}>
      <Bar
        data={{
          labels: data.map((d) => d.label),
          datasets: [
            {
              data: data.map((d) => d.value),
              backgroundColor: theme.accent,
              borderRadius: 4,
              maxBarThickness: 32,
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
                label: (ctx) => `${ctx.parsed.y} new joiner${ctx.parsed.y === 1 ? "" : "s"}`,
              },
            },
          },
          scales: {
            y: {
              beginAtZero: true,
              max,
              ticks: { stepSize: max / 4, color: theme.muted, font: { size: 10 }, precision: 0 },
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
