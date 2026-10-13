"use client";

import Link from "next/link";
import { Clock } from "lucide-react";
import { formatDuration } from "@/lib/employee/time-format";
import { useAttendanceSession } from "./useAttendanceSession";
import styles from "./ClockHoursCard.module.css";

const STATUS_LABEL: Record<string, string> = {
  idle: "Not clocked in",
  "clocked-in": "Clocked in",
  "on-break": "On break",
  "clocked-out": "Clocked out",
};

// Small dashboard-only card: just the ticking "Hours Logged" counter and one
// quick action. Everything else (break timer, work mode, break list) lives
// on the full tracker at Attendance & Leave > Today, which reads/writes the
// same session via `useAttendanceSession`.
export default function ClockHoursCard() {
  const { session, locating, netMs, handleClockIn, handleClockOut } = useAttendanceSession();

  return (
    <div className={styles.card}>
      <div className={styles.left}>
        <span className={styles.icon}>
          <Clock size={20} strokeWidth={1.75} />
        </span>
        <div>
          <span className={styles.label}>Hours Logged</span>
          <span className={styles.value}>{formatDuration(netMs)}</span>
          <span className={styles.status}>{STATUS_LABEL[session.status]}</span>
        </div>
      </div>

      {session.status === "idle" && (
        <button
          type="button"
          className={`${styles.button} ${styles["button-primary"]}`}
          onClick={handleClockIn}
          disabled={locating}
        >
          {locating ? "Locating..." : "Clock In"}
        </button>
      )}

      {session.status === "clocked-in" && (
        <button type="button" className={`${styles.button} ${styles["button-danger"]}`} onClick={handleClockOut}>
          Clock Out
        </button>
      )}

      {(session.status === "on-break" || session.status === "clocked-out") && (
        <Link href="/employee/attendance" className={`${styles.button} ${styles["button-muted"]}`}>
          {session.status === "on-break" ? "On break" : "Done"}
        </Link>
      )}
    </div>
  );
}
