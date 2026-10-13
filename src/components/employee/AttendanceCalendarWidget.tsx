import type { AttendanceCalendarDay, AttendanceLogEntry } from "@/types/employee";
import { formatTime } from "./AttendanceLogTable";
import styles from "./AttendanceCalendarWidget.module.css";

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

const CELL_CLASS: Record<AttendanceCalendarDay["status"], string> = {
  Present: "cell-present",
  "Half Day": "cell-halfday",
  Absent: "cell-absent",
  "On Leave": "cell-onleave",
  Weekend: "cell-weekend",
  Holiday: "cell-holiday",
  Upcoming: "cell-upcoming",
};

const LEGEND = [
  { label: "Present", color: "var(--color-success)" },
  { label: "Half day", color: "var(--color-warning)" },
  { label: "Leave", color: "var(--color-danger)" },
  { label: "Holiday", color: "#7c3aed" },
];

function formatHolidayDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { day: "2-digit", month: "short" });
}

interface AttendanceCalendarWidgetProps {
  days: AttendanceCalendarDay[];
  entries?: AttendanceLogEntry[];
  selectedDate?: string | null;
  onDayClick?: (date: string) => void;
}

// Calendar grid on the left; a bigger, one-per-row legend column on the
// right (not a small inline row) so Present/Half Day/Leave/Holiday read
// clearly, plus the actual festival name for any holiday in the month.
// `entries`/`selectedDate`/`onDayClick` are optional and only used by the
// History panel's Calendar view - the dashboard's own read-only usage
// passes none of them, so its look stays unchanged.
export default function AttendanceCalendarWidget({ days, entries, selectedDate, onDayClick }: AttendanceCalendarWidgetProps) {
  if (days.length === 0) return null;

  const first = new Date(days[0].date);
  const monthLabel = first.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const leadingBlanks = first.getDay(); // 0 (Sun) .. 6 (Sat)
  const todayKey = new Date().toLocaleDateString("en-CA");
  const holidays = days.filter((d) => d.status === "Holiday" && d.label);
  const selectedEntry = entries?.find((e) => e.date === selectedDate);

  return (
    <div className={styles.layout}>
      <div className={styles.calendarCol}>
        <div className={styles.header}>
          <span className={styles.monthLabel}>{monthLabel}</span>
          {days.some((d) => d.date === todayKey) && <span className={styles.todayChip}>Today: {new Date().getDate()}</span>}
        </div>

        <div className={styles.weekRow}>
          {WEEKDAY_LABELS.map((w, i) => (
            <span className={styles.weekday} key={i}>
              {w}
            </span>
          ))}
        </div>

        <div className={styles.grid}>
          {Array.from({ length: leadingBlanks }).map((_, i) => (
            <span key={`blank-${i}`} className={`${styles.cell} ${styles["cell-empty"]}`} />
          ))}
          {days.map((day) => {
            const dayNum = new Date(day.date).getDate();
            const isToday = day.date === todayKey;
            const isSelected = day.date === selectedDate;
            return (
              <span
                key={day.date}
                className={`${styles.cell} ${styles[CELL_CLASS[day.status]]} ${isToday ? styles["cell-today"] : ""} ${
                  onDayClick ? styles["cell-clickable"] : ""
                } ${isSelected ? styles["cell-selected"] : ""}`}
                title={day.label ? `${day.label} · ${day.status}` : day.status}
                role={onDayClick ? "button" : undefined}
                tabIndex={onDayClick ? 0 : undefined}
                onClick={onDayClick ? () => onDayClick(day.date) : undefined}
                onKeyDown={
                  onDayClick
                    ? (e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onDayClick(day.date);
                        }
                      }
                    : undefined
                }
              >
                {dayNum}
              </span>
            );
          })}
        </div>
      </div>

      <div className={styles.legendCol}>
        <p className={styles.legendTitle}>Legend</p>
        {LEGEND.map((item) => (
          <div className={styles.legendItem} key={item.label}>
            <span className={styles.legendSwatch} style={{ background: item.color }} />
            <span className={styles.legendText}>{item.label}</span>
          </div>
        ))}

        {holidays.length > 0 && (
          <div className={styles.holidays}>
            <p className={styles.holidaysLabel}>Holidays</p>
            {holidays.map((h) => (
              <div className={styles.holidayRow} key={h.date}>
                <span className={styles.holidayName}>{h.label}</span>
                <span className={styles.holidayDate}>{formatHolidayDate(h.date)}</span>
              </div>
            ))}
          </div>
        )}

        {onDayClick && selectedDate && (
          <div className={styles.dayDetail}>
            <p className={styles.dayDetailLabel}>
              {new Date(selectedDate).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
            </p>
            {selectedEntry ? (
              <>
                <div className={styles.dayDetailRow}>
                  <span className={styles.dayDetailKey}>Clock in</span>
                  <span className={styles.dayDetailValue}>{formatTime(selectedEntry.clockIn)}</span>
                </div>
                <div className={styles.dayDetailRow}>
                  <span className={styles.dayDetailKey}>Clock out</span>
                  <span className={styles.dayDetailValue}>{formatTime(selectedEntry.clockOut)}</span>
                </div>
                <div className={styles.dayDetailRow}>
                  <span className={styles.dayDetailKey}>Break</span>
                  <span className={styles.dayDetailValue}>
                    {selectedEntry.breakMinutes > 0 ? `${selectedEntry.breakMinutes} min` : "–"}
                  </span>
                </div>
              </>
            ) : (
              <p className={styles.dayDetailEmpty}>No clock-in record for this day.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
