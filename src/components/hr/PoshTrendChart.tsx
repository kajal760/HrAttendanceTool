"use client";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { useChartTheme } from "@/components/hr/charts/useChartTheme";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

export interface PoshTrendPoint {
  label: string;
  total: number;
  resolved: number;
}

interface PoshTrendChartProps {
  data: PoshTrendPoint[];
}

// Two-series monthly trend (complaints filed vs resolved) - same Chart.js
// line-chart shell as LeaveTrendChart, generalized to this module's series.
export default function PoshTrendChart({ data }: PoshTrendChartProps) {
  const theme = useChartTheme();
  if (data.length === 0) return null;
  const max = Math.max(1, ...data.map((d) => Math.max(d.total, d.resolved)));

  return (
    <div style={{ height: 240 }}>
      <Line
        data={{
          labels: data.map((d) => d.label),
          datasets: [
            {
              label: "Total Complaints",
              data: data.map((d) => d.total),
              borderColor: theme.series[0] ?? theme.accent,
              backgroundColor: `${theme.series[0] ?? theme.accent}26`,
              fill: true,
              tension: 0.35,
              pointRadius: 3,
              pointHoverRadius: 5,
            },
            {
              label: "Resolved",
              data: data.map((d) => d.resolved),
              borderColor: theme.series[5] ?? theme.accent,
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
              ticks: { color: theme.muted, font: { size: 10 }, precision: 0 },
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
