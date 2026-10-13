import type { AttendanceDayStatus, AttendanceLogEntry } from "@/types/employee";
import styles from "./AttendanceLogTable.module.css";

const BADGE_CLASS: Record<AttendanceDayStatus, string> = {
  Present: "badge-present",
  "Half Day": "badge-halfday",
  Absent: "badge-absent",
  "On Leave": "badge-onleave",
};

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function formatTime(iso?: string): string {
  if (!iso) return "–";
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

interface AttendanceLogTableProps {
  entries: AttendanceLogEntry[];
}

export default function AttendanceLogTable({ entries }: AttendanceLogTableProps) {
  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th>Date</th>
          <th>Clock in</th>
          <th>Clock out</th>
          <th>Work mode</th>
          <th>Break</th>
          <th>Net hours</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {entries.map((entry) => (
          <tr key={entry.id}>
            <td>{formatDate(entry.date)}</td>
            <td>{formatTime(entry.clockIn)}</td>
            <td>{formatTime(entry.clockOut)}</td>
            <td className={styles.muted}>{entry.workMode}</td>
            <td className={styles.muted}>
              {entry.breakMinutes > 0 ? `${entry.breakMinutes} min` : "–"}
            </td>
            <td>{entry.netHours > 0 ? `${entry.netHours.toFixed(1)} h` : "–"}</td>
            <td>
              <span className={`${styles.badge} ${styles[BADGE_CLASS[entry.status]]}`}>
                {entry.status}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
