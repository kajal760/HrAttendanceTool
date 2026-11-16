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

export interface AttendanceTrendPoint {
  label: string;
  present: number;
  absent: number;
  wfh: number;
}

interface AttendanceTrendChartProps {
  data: AttendanceTrendPoint[];
}

// Three-series monthly trend (Present / Absent / WFH) - same Chart.js line
// shell as LeaveTrendChart/PoshTrendChart, with a third series for the
// specific mix this dashboard needs.
export default function AttendanceTrendChart({ data }: AttendanceTrendChartProps) {
  const theme = useChartTheme();
  if (data.length === 0) return null;
  const max = Math.max(1, ...data.map((d) => Math.max(d.present, d.absent, d.wfh)));

  return (
    <div style={{ height: 240 }}>
      <Line
        data={{
          labels: data.map((d) => d.label),
          datasets: [
            {
              label: "Present",
              data: data.map((d) => d.present),
              borderColor: theme.series[5] ?? theme.accent,
              backgroundColor: "transparent",
              tension: 0.35,
              pointRadius: 3,
              pointHoverRadius: 5,
            },
            {
              label: "Absent",
              data: data.map((d) => d.absent),
              borderColor: theme.series[7] ?? "#e34948",
              backgroundColor: "transparent",
              tension: 0.35,
              pointRadius: 3,
              pointHoverRadius: 5,
            },
            {
              label: "WFH",
              data: data.map((d) => d.wfh),
              borderColor: theme.series[0] ?? theme.accent,
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
