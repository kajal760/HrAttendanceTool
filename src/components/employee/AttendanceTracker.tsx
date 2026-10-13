"use client";

import { Clock } from "lucide-react";
import type { WorkMode } from "@/types/employee";
import { formatClock, formatDuration } from "@/lib/employee/time-format";
import { useAttendanceSession } from "./useAttendanceSession";
import TodayBreaksList from "./TodayBreaksList";
import styles from "./AttendanceTracker.module.css";

const STATUS_LABEL: Record<string, string> = {
  idle: "Not clocked in",
  "clocked-in": "Clocked in",
  "on-break": "On break",
  "clocked-out": "Clocked out",
};

const STATUS_CLASS: Record<string, string> = {
  idle: "statusBadge-idle",
  "clocked-in": "statusBadge-clockedin",
  "on-break": "statusBadge-onbreak",
  "clocked-out": "statusBadge-clockedout",
};

// Full attendance widget - work mode, Clock In, Start/End Break, Clock Out,
// and today's break list. Lives on Attendance & Leave > Today; the
// dashboard shows the compact `ClockHoursCard` instead, driven by the same
// `useAttendanceSession` hook so both read/write one shared session.
export default function AttendanceTracker() {
  const {
    session,
    geoError,
    locating,
    netMs,
    breakMs,
    setWorkMode,
    handleClockIn,
    handleStartBreak,
    handleEndBreak,
    handleClockOut,
  } = useAttendanceSession();

  const canClockIn = session.status === "idle";
  const canStartBreak = session.status === "clocked-in";
  const canEndBreak = session.status === "on-break";
  const canClockOut = session.status === "clocked-in";

  // Single quick-action button for the compact summary header, mirroring
  // the reference dashboard's one-click Clock Out. The full set of
  // controls (work mode, Start/End Break, Clock Out) still lives below for
  // the states that offer more than one option at once.
  const quickAction =
    session.status === "idle"
      ? { label: locating ? "Locating..." : "Clock In", onClick: handleClockIn, disabled: locating }
      : session.status === "clocked-in"
        ? { label: "Clock Out", onClick: handleClockOut, disabled: false }
        : session.status === "on-break"
          ? { label: "End Break", onClick: handleEndBreak, disabled: false }
          : null;

  return (
    <div>
      <div className={styles.summaryRow}>
        <div className={styles.summaryLeft}>
          <span className={styles.summaryIcon}>
            <Clock size={20} strokeWidth={1.75} />
          </span>
          <div>
            <span className={styles.summaryLabel}>Hours Logged</span>
            <span className={styles.summaryValue}>{formatDuration(netMs)}</span>
          </div>
        </div>
        {quickAction && (
          <button
            type="button"
            className={`${styles.quickButton} ${
              session.status === "clocked-in" ? styles["quickButton-danger"] : styles["quickButton-primary"]
            }`}
            onClick={quickAction.onClick}
            disabled={quickAction.disabled}
          >
            {quickAction.label}
          </button>
        )}
      </div>

      <div className={styles.topRow}>
        <span className={`${styles.statusBadge} ${styles[STATUS_CLASS[session.status]]}`}>
          {STATUS_LABEL[session.status]}
          {session.workMode && session.status !== "idle" ? ` · ${session.workMode}` : ""}
        </span>
        {session.clockInAt && (
          <span className={styles.summaryLine} style={{ margin: 0 }}>
            Clocked in at {formatClock(session.clockInAt)}
            {session.clockOutAt ? ` · out at ${formatClock(session.clockOutAt)}` : ""}
          </span>
        )}
      </div>

      <div className={styles.timers}>
        <div className={styles.timerBlock}>
          <span className={styles.timerLabel}>Break time</span>
          <span className={`${styles.timerValue} ${styles["timerValue-muted"]}`}>{formatDuration(breakMs)}</span>
        </div>
      </div>

      <div className={styles.controls}>
        {canClockIn && (
          <select
            className={styles.select}
            value={session.workMode}
            onChange={(e) => setWorkMode(e.target.value as WorkMode)}
            aria-label="Work mode"
          >
            <option value="Office">Office</option>
            <option value="Work From Home">Work From Home</option>
          </select>
        )}

        {canClockIn && (
          <button
            type="button"
            className={`${styles.button} ${styles["button-primary"]}`}
            onClick={handleClockIn}
            disabled={locating}
          >
            {locating ? "Locating..." : "Clock In"}
          </button>
        )}

        {canStartBreak && (
          <button type="button" className={`${styles.button} ${styles["button-warning"]}`} onClick={handleStartBreak}>
            Start Break
          </button>
        )}

        {canEndBreak && (
          <button type="button" className={`${styles.button} ${styles["button-primary"]}`} onClick={handleEndBreak}>
            End Break
          </button>
        )}

        {(canClockOut || canEndBreak) && (
          <button
            type="button"
            className={`${styles.button} ${styles["button-danger"]}`}
            onClick={handleClockOut}
            disabled={session.status === "on-break"}
            title={session.status === "on-break" ? "End your break before clocking out" : undefined}
          >
            Clock Out
          </button>
        )}
      </div>

      {geoError && <div className={`${styles.hint} ${styles["hint-error"]}`}>{geoError}</div>}
      {session.location && (
        <div className={styles.hint}>
          Location captured ({session.location.lat.toFixed(4)}, {session.location.lng.toFixed(4)})
        </div>
      )}

      {session.breaks.length > 0 && (
        <div className={styles.breakList}>
          <TodayBreaksList />
        </div>
      )}

      {session.status === "clocked-out" && (
        <p className={styles.summaryLine}>
          Day complete: {formatDuration(netMs)} net working time, {formatDuration(breakMs)} on break.
        </p>
      )}
    </div>
  );
}
