import type { LeaveRequest } from "@/types/employee";
import styles from "./Leave.module.css";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function dateKey(d: Date): string {
  return d.toLocaleDateString("en-CA");
}

function inRange(day: string, request: LeaveRequest): boolean {
  return day >= request.startDate && day <= request.endDate;
}

function initialsOf(name: string): string {
  return name.split(" ").map((n) => n[0]).join("");
}

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

interface LeaveWeekViewProps {
  requests: LeaveRequest[];
  anchor: Date;
}

// This calendar week (Sun-Sat containing `anchor`), one column per day -
// same chip-per-request convention as the month grid, just a single row.
export default function LeaveWeekView({ requests, anchor }: LeaveWeekViewProps) {
  const today = new Date();
  const todayKey = dateKey(today);
  const relevant = requests.filter((r) => r.status === "Approved" || r.status === "Pending");
  const start = startOfWeek(anchor);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
  const label = `${days[0].toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${days[6].toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;

  return (
    <div className={styles.calendarCard}>
      <div className={styles.calendarHeader}>
        <span className={styles.monthLabel}>{label}</span>
      </div>
      <div className={styles.calendarGrid}>
        {days.map((day, i) => {
          const key = dateKey(day);
          const onLeave = relevant.filter((r) => inRange(key, r));
          const isToday = key === todayKey;
          const isWeekend = i === 0 || i === 6;
          const cellClass = [styles.dayCell, isToday ? styles.dayCellToday : isWeekend ? styles.dayCellWeekend : ""]
            .filter(Boolean)
            .join(" ");
          return (
            <div key={key} style={{ display: "flex", flexDirection: "column" }}>
              <span className={styles.weekday}>{WEEKDAY_LABELS[i]}</span>
              <div className={cellClass} style={{ minHeight: 140 }}>
                <span className={isToday ? styles.dayNumberToday : styles.dayNumber}>{day.getDate()}</span>
                <div className={styles.dayChips} style={{ flexDirection: "column" }}>
                  {onLeave.map((r) => (
                    <span
                      key={r.id}
                      className={`${styles.dayChip} ${styles[r.status === "Approved" ? "dayChip-approved" : "dayChip-pending"]}`}
                      title={`${r.employeeName} - ${r.category} (${r.status})`}
                      style={{ width: "100%" }}
                    >
                      {initialsOf(r.employeeName)} · {r.category}
                    </span>
                  ))}
                  {onLeave.length === 0 && <span className={styles.muted} style={{ fontSize: 11 }}>-</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
