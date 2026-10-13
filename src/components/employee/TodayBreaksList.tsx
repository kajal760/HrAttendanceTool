"use client";

import { formatClock } from "@/lib/employee/time-format";
import { useAttendanceSession } from "./useAttendanceSession";
import styles from "./TodayBreaksList.module.css";

// Today's live break list - reads the same session `AttendanceTracker` does,
// so it stays in sync wherever it's rendered (the Today card, or the new
// Breaks page). Extracted out so the Breaks page can show it without also
// showing the full clock-in/out controls.
export default function TodayBreaksList() {
  const { session } = useAttendanceSession();

  if (session.breaks.length === 0) {
    return <p className={styles.empty}>No breaks yet today.</p>;
  }

  return (
    <div className={styles.breakList}>
      <p className={styles.breakListTitle}>Today&apos;s breaks</p>
      {session.breaks.map((b, i) => (
        <div className={styles.breakRow} key={b.id}>
          <span>Break {i + 1}</span>
          <span>
            {formatClock(b.startedAt)} &ndash; {b.endedAt ? formatClock(b.endedAt) : "ongoing"}
          </span>
        </div>
      ))}
    </div>
  );
}
