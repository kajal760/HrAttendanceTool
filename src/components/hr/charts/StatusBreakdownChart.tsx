"use client";

import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { Doughnut } from "react-chartjs-2";
import { useChartTheme } from "./useChartTheme";

ChartJS.register(ArcElement, Tooltip, Legend);

export interface StatusBreakdownSlice {
  label: string;
  value: number;
}

interface StatusBreakdownChartProps {
  data: StatusBreakdownSlice[];
}

// Today's attendance status mix (Present / Late / Absent / On Leave) as a
// Chart.js doughnut - themed from the project's --color-chart-series-* vars.
export default function StatusBreakdownChart({ data }: StatusBreakdownChartProps) {
  const theme = useChartTheme();
  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <Doughnut
      data={{
        labels: data.map((d) => d.label),
        datasets: [
          {
            data: data.map((d) => d.value),
            backgroundColor: theme.series,
            borderColor: theme.surface,
            borderWidth: 2,
            hoverOffset: 6,
          },
        ],
      }}
      options={{
        responsive: true,
        maintainAspectRatio: false,
        cutout: "65%",
        plugins: {
          legend: {
            position: "bottom",
            labels: { color: theme.text, boxWidth: 10, boxHeight: 10, padding: 16 },
          },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const value = ctx.parsed as number;
                const pct = total > 0 ? Math.round((value / total) * 100) : 0;
                return `${ctx.label}: ${value} (${pct}%)`;
              },
            },
          },
        },
      }}
    />
  );
}
