import type { AttendanceLogEntry } from "@/types/employee";
import styles from "./TimesheetSummary.module.css";

function mondayKey(dateStr: string): string {
  const d = new Date(dateStr);
  const day = d.getDay(); // 0 = Sun
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toLocaleDateString("en-CA");
}

function formatRange(mondayIso: string): string {
  const start = new Date(mondayIso);
  const end = new Date(start);
  end.setDate(end.getDate() + 4);
  const fmt = (d: Date) => d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return `${fmt(start)} – ${fmt(end)}`;
}

interface TimesheetSummaryProps {
  entries: AttendanceLogEntry[];
}

// Groups the daily timesheet rows into Mon–Fri weeks for a quick weekly
// roll-up above the day-by-day table.
export default function TimesheetSummary({ entries }: TimesheetSummaryProps) {
  const weeks = new Map<string, AttendanceLogEntry[]>();
  for (const entry of entries) {
    const key = mondayKey(entry.date);
    const bucket = weeks.get(key) ?? [];
    bucket.push(entry);
    weeks.set(key, bucket);
  }

  const sortedKeys = [...weeks.keys()].sort((a, b) => (a < b ? 1 : -1));

  return (
    <div className={styles.list}>
      {sortedKeys.map((key) => {
        const weekEntries = weeks.get(key)!;
        const netHours = weekEntries.reduce((sum, e) => sum + e.netHours, 0);
        const breakMinutes = weekEntries.reduce((sum, e) => sum + e.breakMinutes, 0);
        const daysPresent = weekEntries.filter((e) => e.status === "Present" || e.status === "Half Day").length;
        return (
          <div className={styles.row} key={key}>
            <span className={styles.range}>{formatRange(key)}</span>
            <div className={styles.stats}>
              <div className={styles.stat}>
                <span className={styles.statValue}>{netHours.toFixed(1)} h</span>
                <span className={styles.statLabel}>Net hours</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statValue}>{breakMinutes} min</span>
                <span className={styles.statLabel}>Break</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statValue}>{daysPresent}</span>
                <span className={styles.statLabel}>Days present</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
