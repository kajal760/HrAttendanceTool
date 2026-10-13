"use client";

import { useMemo, useState } from "react";
import type { DailyRecord, DailyStatus, WorkMode } from "@/lib/hr/attendance-daily";
import { fmtDuration } from "@/lib/hr/attendance-format";
import { toneClass, type BadgeTone } from "../lifecycle/badge-tones";
import styles from "../lifecycle/Lifecycle.module.css";
import WorkModeSwitch from "./WorkModeSwitch";

const STATUS_TONE: Record<DailyStatus, BadgeTone> = {
  Present: "green",
  Late: "amber",
  Absent: "red",
  "On Leave": "gray",
};

const STATUSES: DailyStatus[] = ["Present", "Late", "Absent", "On Leave"];

interface AttendanceTableProps {
  records: DailyRecord[];
  variant: "overview" | "daily";
}

// The table behind both the Overview and Daily Attendance views. Filters
// narrow the already-loaded records for the chosen date.
export default function AttendanceTable({ records, variant }: AttendanceTableProps) {
  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [status, setStatus] = useState<DailyStatus | "">("");
  const [workMode, setWorkMode] = useState<WorkMode | "">("");

  const departments = useMemo(() => Array.from(new Set(records.map((r) => r.department))).sort(), [records]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return records.filter((r) => {
      if (q && !(r.name.toLowerCase().includes(q) || r.employeeCode.toLowerCase().includes(q))) return false;
      if (department && r.department !== department) return false;
      if (employeeId && r.employeeId !== employeeId) return false;
      if (status && r.status !== status) return false;
      if (workMode && r.workMode !== workMode) return false;
      return true;
    });
  }, [records, query, department, employeeId, status, workMode]);

  const modeLabel = (r: DailyRecord) => r.workMode ?? "-";

  return (
    <div>
      <div className={styles.toolbar}>
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Search employee or ID..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select className={styles.filterSelect} value={department} onChange={(e) => setDepartment(e.target.value)} aria-label="Filter by department">
          <option value="">All departments</option>
          {departments.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
        {variant === "daily" && (
          <select className={styles.filterSelect} value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} aria-label="Filter by employee">
            <option value="">All employees</option>
            {records.map((r) => (
              <option key={r.employeeId} value={r.employeeId}>{r.name}</option>
            ))}
          </select>
        )}
        <select className={styles.filterSelect} value={status} onChange={(e) => setStatus(e.target.value as DailyStatus | "")} aria-label="Filter by status">
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <WorkModeSwitch value={workMode} onChange={setWorkMode} />
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            {variant === "overview" ? (
              <tr>
                <th>Employee</th>
                <th>Employee ID</th>
                <th>Department</th>
                <th>Status</th>
                <th>Check-in</th>
                <th>Check-out</th>
                <th>Working hours</th>
                <th>Work mode</th>
              </tr>
            ) : (
              <tr>
                <th>Employee</th>
                <th>Department</th>
                <th>Status</th>
                <th>Check-in</th>
                <th>Check-out</th>
                <th>Working hours</th>
                <th>Break</th>
                <th>Work mode</th>
                <th>Location</th>
              </tr>
            )}
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.employeeId}>
                <td style={{ fontWeight: 600 }}>{r.name}</td>
                {variant === "overview" ? <td className={styles.muted}>{r.employeeCode}</td> : <td>{r.department}</td>}
                {variant === "overview" ? <td>{r.department}</td> : null}
                <td>
                  <span className={toneClass(styles, STATUS_TONE[r.status])}>{r.status}</span>
                </td>
                <td>{r.checkIn ?? "-"}</td>
                <td>{r.checkOut ?? (r.checkIn ? "Working" : "-")}</td>
                <td>{fmtDuration(r.workingMin)}</td>
                {variant === "daily" && <td>{r.checkIn ? `${r.breakMin} min` : "-"}</td>}
                <td>{modeLabel(r)}</td>
                {variant === "daily" && (
                  <td className={r.location === "Verified" ? undefined : styles.muted} style={r.location === "Outside office range" || r.location === "Not verified" ? { color: "var(--color-danger)", fontWeight: 600 } : undefined}>
                    {r.location}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className={styles.empty}>No attendance records match these filters.</div>}
      </div>
    </div>
  );
}
