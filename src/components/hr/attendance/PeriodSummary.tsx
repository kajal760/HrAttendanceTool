"use client";

import { useMemo, useState } from "react";
import type { DailyRecord } from "@/lib/hr/attendance-daily";
import { fmtDuration } from "@/lib/hr/attendance-format";
import { toneClass } from "../lifecycle/badge-tones";
import styles from "../lifecycle/Lifecycle.module.css";
import AttendanceTable from "./AttendanceTable";
import WorkModeSwitch from "./WorkModeSwitch";

interface PeriodSummaryProps {
  records: DailyRecord[];
  periodLabel: string;
}

interface Row {
  employeeId: string;
  name: string;
  employeeCode: string;
  department: string;
  present: number;
  late: number;
  wfh: number;
  absent: number;
  onLeave: number;
  attended: number;
  workedMin: number;
  rate: number; // % of non-leave days attended
}

// Attendance for a multi-day period: one row per employee with totals, and a
// click to see that employee's day-by-day records within the period.
export default function PeriodSummary({ records: allRecords, periodLabel }: PeriodSummaryProps) {
  const [mode, setMode] = useState<"" | "Office" | "WFH">("");
  const records = useMemo(() => (mode ? allRecords.filter((r) => r.workMode === mode) : allRecords), [allRecords, mode]);
  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const rows = useMemo<Row[]>(() => {
    const byEmp = new Map<string, Row>();
    for (const r of records) {
      let row = byEmp.get(r.employeeId);
      if (!row) {
        row = {
          employeeId: r.employeeId,
          name: r.name,
          employeeCode: r.employeeCode,
          department: r.department,
          present: 0,
          late: 0,
          wfh: 0,
          absent: 0,
          onLeave: 0,
          attended: 0,
          workedMin: 0,
          rate: 0,
        };
        byEmp.set(r.employeeId, row);
      }
      if (r.status === "Present") row.present++;
      if (r.status === "Late") row.late++;
      if (r.status === "Absent") row.absent++;
      if (r.status === "On Leave") row.onLeave++;
      if (r.status === "Present" || r.status === "Late") {
        row.attended++;
        if (r.workMode === "WFH") row.wfh++;
        if (r.workingMin) row.workedMin += r.workingMin;
      }
    }
    for (const row of byEmp.values()) {
      const denom = row.attended + row.absent;
      row.rate = denom === 0 ? 0 : Math.round((row.attended / denom) * 100);
    }
    return Array.from(byEmp.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [records]);

  const departments = useMemo(() => Array.from(new Set(rows.map((r) => r.department))).sort(), [rows]);

  const shown = rows.filter((r) => {
    const q = query.trim().toLowerCase();
    if (q && !(r.name.toLowerCase().includes(q) || r.employeeCode.toLowerCase().includes(q))) return false;
    if (department && r.department !== department) return false;
    return true;
  });

  const totals = {
    present: records.filter((r) => r.status === "Present").length,
    late: records.filter((r) => r.status === "Late").length,
    wfh: records.filter((r) => r.workMode === "WFH" && (r.status === "Present" || r.status === "Late")).length,
    onLeave: records.filter((r) => r.status === "On Leave").length,
    absent: records.filter((r) => r.status === "Absent").length,
  };
  const cards = [
    { label: "Employee-days", value: records.length },
    { label: "Present", value: totals.present },
    { label: "WFH", value: totals.wfh },
    { label: "On Leave", value: totals.onLeave },
    { label: "Late", value: totals.late },
    { label: "Absent", value: totals.absent },
  ];

  const openRecords = openId ? records.filter((r) => r.employeeId === openId) : [];
  const openName = openId ? rows.find((r) => r.employeeId === openId)?.name : null;

  return (
    <div>
      <p className={styles.hint} style={{ marginBottom: 10 }}>Showing {periodLabel}. Weekends are not counted.</p>

      <div className={styles.statGrid}>
        {cards.map((c) => (
          <div key={c.label} className={styles.statCard}>
            <span className={styles.statValue}>{c.value}</span>
            <span className={styles.statLabel}>{c.label}</span>
          </div>
        ))}
      </div>

      <div className={styles.toolbar}>
        <WorkModeSwitch value={mode} onChange={setMode} />
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
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Employee</th>
              <th>Employee ID</th>
              <th>Department</th>
              <th>Present</th>
              <th>Late</th>
              <th>WFH</th>
              <th>Absent</th>
              <th>On leave</th>
              <th>Hours worked</th>
              <th>Attendance</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.employeeId}>
                <td style={{ fontWeight: 600 }}>{r.name}</td>
                <td className={styles.muted}>{r.employeeCode}</td>
                <td>{r.department}</td>
                <td>{r.present}</td>
                <td>{r.late}</td>
                <td>{r.wfh}</td>
                <td className={r.absent > 0 ? undefined : styles.muted}>{r.absent}</td>
                <td>{r.onLeave}</td>
                <td>{fmtDuration(r.workedMin || null)}</td>
                <td>
                  <span className={toneClass(styles, r.rate >= 90 ? "green" : r.rate >= 75 ? "amber" : "red")}>{r.rate}%</span>
                </td>
                <td>
                  <button type="button" className={styles.actionButton} onClick={() => setOpenId(openId === r.employeeId ? null : r.employeeId)}>
                    {openId === r.employeeId ? "Hide days" : "View days"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {shown.length === 0 && <div className={styles.empty}>No employees match these filters.</div>}
      </div>

      {openId && openName && (
        <div style={{ marginTop: 18 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 10px" }}>{openName} - day by day</h3>
          <AttendanceTable records={openRecords} variant="daily" />
        </div>
      )}
    </div>
  );
}
