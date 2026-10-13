"use client";

import { useState } from "react";
import type { AttendanceCalendarDay, AttendanceLogEntry } from "@/types/employee";
import AttendanceLogTable from "./AttendanceLogTable";
import AttendanceCalendarWidget from "./AttendanceCalendarWidget";
import CalendarMonthFilter from "./CalendarMonthFilter";
import styles from "./AttendanceHistoryView.module.css";

interface AttendanceHistoryViewProps {
  entries: AttendanceLogEntry[];
  calendarDays: AttendanceCalendarDay[];
  year: number;
  month: number;
}

// Table/Calendar view switch for the Attendance History page. Always
// visible - this used to be a collapsible section on the Today page
// (`AttendanceHistoryToggle`), but now that History has its own route there
// is no need to hide it behind a disclosure button.
export default function AttendanceHistoryView({ entries, calendarDays, year, month }: AttendanceHistoryViewProps) {
  const [viewMode, setViewMode] = useState<"table" | "calendar">("table");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  return (
    <div className={styles.panel}>
      <div className={styles.modeSwitch}>
        <button
          type="button"
          className={`${styles.modeButton} ${viewMode === "table" ? styles.modeButtonActive : ""}`}
          onClick={() => setViewMode("table")}
        >
          Table
        </button>
        <button
          type="button"
          className={`${styles.modeButton} ${viewMode === "calendar" ? styles.modeButtonActive : ""}`}
          onClick={() => setViewMode("calendar")}
        >
          Calendar
        </button>
      </div>

      {viewMode === "table" ? (
        entries.length === 0 ? (
          <p className={styles.empty}>No attendance records in this range.</p>
        ) : (
          <AttendanceLogTable entries={entries} />
        )
      ) : (
        <>
          <div className={styles.calendarFilter}>
            <CalendarMonthFilter year={year} month={month} />
          </div>
          <AttendanceCalendarWidget
            days={calendarDays}
            entries={entries}
            selectedDate={selectedDate}
            onDayClick={setSelectedDate}
          />
        </>
      )}
    </div>
  );
}
