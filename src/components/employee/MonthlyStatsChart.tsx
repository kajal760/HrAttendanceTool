import type { DailyHoursPoint } from "@/types/employee";
import styles from "./MonthlyStatsChart.module.css";

const BAR_COLORS = ["#14b8a6", "#7c3aed", "#ea580c", "#db2777", "#2563eb", "#16a34a", "#0d9488"];

interface MonthlyStatsChartProps {
  points: DailyHoursPoint[];
}

// CSS-only bar chart (no charting library) - last 7 days' logged hours.
export default function MonthlyStatsChart({ points }: MonthlyStatsChartProps) {
  const max = Math.max(8, ...points.map((p) => p.hours));

  return (
    <div className={styles.chart}>
      {points.map((point, i) => (
        <div className={styles.bar} key={point.date}>
          <span className={styles.barValue}>{point.hours > 0 ? point.hours.toFixed(1) : "–"}</span>
          <div
            className={styles.barFill}
            style={{
              height: `${Math.max((point.hours / max) * 100, point.hours > 0 ? 6 : 2)}%`,
              background: point.hours > 0 ? BAR_COLORS[i % BAR_COLORS.length] : "var(--color-border)",
            }}
          />
          <span className={styles.barLabel}>{point.label}</span>
        </div>
      ))}
    </div>
  );
}
