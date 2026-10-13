import type { AttendanceLogEntry } from "@/types/employee";
import styles from "./BreakTotalsTable.module.css";

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

interface BreakTotalsTableProps {
  entries: AttendanceLogEntry[];
}

// Daily break totals, not individual break sessions - the "Breaks" tab's
// historical half. Individual start/end timestamps only exist for today
// (see `TodayBreaksList`); past days only ever recorded one total.
export default function BreakTotalsTable({ entries }: BreakTotalsTableProps) {
  if (entries.length === 0) {
    return <p className={styles.empty}>No records in this range.</p>;
  }

  const total = entries.reduce((sum, e) => sum + e.breakMinutes, 0);

  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th>Date</th>
          <th>Break time</th>
        </tr>
      </thead>
      <tbody>
        {entries.map((entry) => (
          <tr key={entry.id}>
            <td>{formatDate(entry.date)}</td>
            <td className={entry.breakMinutes === 0 ? styles.muted : undefined}>
              {entry.breakMinutes > 0 ? `${entry.breakMinutes} min` : "–"}
            </td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr>
          <td>Total</td>
          <td className={styles.strong}>{total} min</td>
        </tr>
      </tfoot>
    </table>
  );
}
