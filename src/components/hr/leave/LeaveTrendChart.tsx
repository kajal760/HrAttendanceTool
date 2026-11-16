"use client";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { useChartTheme } from "@/components/hr/charts/useChartTheme";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

export interface LeaveTrendPoint {
  label: string;
  applied: number;
  approved: number;
}

interface LeaveTrendChartProps {
  data: LeaveTrendPoint[];
}

// Two-series monthly trend (requests applied vs approved) - same Chart.js
// line-chart shell as `LineTrendChart`, generalized to plain counts and a
// second series instead of one 0-100 percentage line.
export default function LeaveTrendChart({ data }: LeaveTrendChartProps) {
  const theme = useChartTheme();
  if (data.length === 0) return null;
  const max = Math.max(1, ...data.map((d) => Math.max(d.applied, d.approved)));

  return (
    <div style={{ height: 220 }}>
      <Line
        data={{
          labels: data.map((d) => d.label),
          datasets: [
            {
              label: "Applied",
              data: data.map((d) => d.applied),
              borderColor: theme.series[1] ?? theme.accent,
              backgroundColor: "transparent",
              tension: 0.35,
              pointRadius: 3,
              pointHoverRadius: 5,
            },
            {
              label: "Approved",
              data: data.map((d) => d.approved),
              borderColor: theme.accent,
              backgroundColor: "transparent",
              tension: 0.35,
              pointRadius: 3,
              pointHoverRadius: 5,
            },
          ],
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: "top",
              align: "end",
              labels: { color: theme.text, boxWidth: 10, boxHeight: 10, usePointStyle: true },
            },
          },
          scales: {
            y: {
              min: 0,
              max: Math.ceil(max * 1.2),
              ticks: { color: theme.muted, font: { size: 10 } },
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
