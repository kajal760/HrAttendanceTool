"use client";

import { useEffect, useMemo, useState } from "react";
import { Download } from "lucide-react";
import { fmtDuration, shortDay } from "@/lib/hr/attendance-format";
import Pager from "@/components/employee/Pager";
import styles from "../lifecycle/Lifecycle.module.css";

const PAGE_SIZE = 15;

export interface TimesheetRow {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  date: string;
  projectId: string | null;
  projectName: string | null;
  taskId: string | null;
  taskName: string | null;
  checkIn: string | null;
  checkOut: string | null;
  breakMin: number;
  workingMin: number | null;
}

function toCsv(rows: TimesheetRow[]): string {
  const header = ["Employee", "Department", "Date", "Project", "Task", "Clock In", "Clock Out", "Break", "Total Hours"].join(",");
  const escape = (v: unknown) => {
    const s = v === undefined || v === null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = rows.map((r) =>
    [
      r.employeeName,
      r.department,
      r.date,
      r.projectName ?? "",
      r.taskName ?? "",
      r.checkIn ?? "",
      r.checkOut ?? "",
      fmtDuration(r.breakMin),
      fmtDuration(r.workingMin),
    ]
      .map(escape)
      .join(","),
  );
  return [header, ...lines].join("\n");
}

interface TimesheetOverviewTableProps {
  rows: TimesheetRow[];
}

// The one Timesheet Overview table - filters, export, and pagination over
// rows already joined (attendance x task records) server side in the page.
export default function TimesheetOverviewTable({ rows }: TimesheetOverviewTableProps) {
  const [employeeFilter, setEmployeeFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  const [taskFilter, setTaskFilter] = useState("");
  const [page, setPage] = useState(0);

  const employees = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of rows) map.set(r.employeeId, r.employeeName);
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [rows]);

  const departments = useMemo(() => Array.from(new Set(rows.map((r) => r.department))).sort(), [rows]);

  const projects = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of rows) if (r.projectId && r.projectName) map.set(r.projectId, r.projectName);
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [rows]);

  const tasks = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of rows) if (r.taskId && r.taskName) map.set(r.taskId, r.taskName);
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [rows]);

  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        if (employeeFilter && r.employeeId !== employeeFilter) return false;
        if (departmentFilter && r.department !== departmentFilter) return false;
        if (projectFilter && r.projectId !== projectFilter) return false;
        if (taskFilter && r.taskId !== taskFilter) return false;
        return true;
      }),
    [rows, employeeFilter, departmentFilter, projectFilter, taskFilter],
  );

  useEffect(() => {
    setPage(0);
  }, [employeeFilter, departmentFilter, projectFilter, taskFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  function exportCsv() {
    const filename = `timesheet-${new Date().toISOString().slice(0, 10)}.csv`;
    const blob = new Blob([toCsv(filtered)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className={styles.toolbar}>
        <select className={styles.filterSelect} value={employeeFilter} onChange={(e) => setEmployeeFilter(e.target.value)} aria-label="Filter by employee">
          <option value="">All Employees</option>
          {employees.map(([id, name]) => (
            <option key={id} value={id}>{name}</option>
          ))}
        </select>
        <select className={styles.filterSelect} value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)} aria-label="Filter by department">
          <option value="">All Departments</option>
          {departments.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
        <select className={styles.filterSelect} value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} aria-label="Filter by project">
          <option value="">All Projects</option>
          {projects.map(([id, name]) => (
            <option key={id} value={id}>{name}</option>
          ))}
        </select>
        <select className={styles.filterSelect} value={taskFilter} onChange={(e) => setTaskFilter(e.target.value)} aria-label="Filter by task">
          <option value="">All Tasks</option>
          {tasks.map(([id, title]) => (
            <option key={id} value={id}>{title}</option>
          ))}
        </select>
        <button type="button" className={styles.actionButton} onClick={exportCsv}>
          <Download size={13} strokeWidth={2.25} /> Export
        </button>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Employee</th>
              <th>Date</th>
              <th>Project</th>
              <th>Task</th>
              <th>Clock In</th>
              <th>Clock Out</th>
              <th>Break</th>
              <th>Total Hours</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((r) => (
              <tr key={r.id}>
                <td>
                  <span className={styles.strong}>{r.employeeName}</span>
                  <div className={styles.muted}>{r.department}</div>
                </td>
                <td className={styles.muted}>{shortDay(r.date)}</td>
                <td>{r.projectName ?? "-"}</td>
                <td className={styles.muted}>{r.taskName ?? "-"}</td>
                <td>{r.checkIn ?? "-"}</td>
                <td>{r.checkOut ?? (r.checkIn ? "Working" : "-")}</td>
                <td className={styles.muted}>{fmtDuration(r.breakMin)}</td>
                <td className={styles.strong}>{fmtDuration(r.workingMin)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {pageRows.length === 0 && <div className={styles.empty}>No timesheet records match these filters.</div>}
      </div>
      <Pager page={page} totalPages={totalPages} onChange={setPage} />
    </div>
  );
}
