"use client";

import { useMemo, useState } from "react";
import type { EmployeeOverview } from "@/types/hr";
import type { TimesheetEntry } from "@/types/timesheet";
import Pager from "@/components/employee/Pager";
import styles from "../leave/Leave.module.css";

const PAGE_SIZE = 10;

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

interface TimesheetEntriesTableProps {
  entries: TimesheetEntry[];
  employees: EmployeeOverview[];
  taskTitles: Record<string, string>;
}

export default function TimesheetEntriesTable({ entries, employees, taskTitles }: TimesheetEntriesTableProps) {
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [employeeQuery, setEmployeeQuery] = useState("");
  const [taskFilter, setTaskFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [page, setPage] = useState(0);

  const employeesById = useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees]);
  const departments = useMemo(() => Array.from(new Set(employees.map((e) => e.department))).sort(), [employees]);
  const taskOptions = useMemo(
    () => Object.entries(taskTitles).sort((a, b) => a[1].localeCompare(b[1])),
    [taskTitles],
  );

  const sorted = useMemo(() => [...entries].sort((a, b) => (a.date < b.date ? 1 : -1)), [entries]);
  const filtered = useMemo(() => {
    const q = employeeQuery.trim().toLowerCase();
    return sorted.filter((e) => {
      const emp = employeesById.get(e.employeeId);
      if (departmentFilter && emp?.department !== departmentFilter) return false;
      if (q && !(emp?.name.toLowerCase().includes(q) || e.employeeId.toLowerCase().includes(q))) return false;
      if (taskFilter && e.taskId !== taskFilter) return false;
      if (dateFilter && e.date !== dateFilter) return false;
      return true;
    });
  }, [sorted, departmentFilter, employeesById, employeeQuery, taskFilter, dateFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageEntries = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  return (
    <div>
      <div className={styles.filterRow}>
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Search employee or ID..."
          value={employeeQuery}
          onChange={(e) => {
            setEmployeeQuery(e.target.value);
            setPage(0);
          }}
        />
        <select
          className={styles.departmentSelect}
          style={{ marginLeft: 0 }}
          value={taskFilter}
          onChange={(e) => {
            setTaskFilter(e.target.value);
            setPage(0);
          }}
          aria-label="Filter by task"
        >
          <option value="">All tasks</option>
          {taskOptions.map(([id, title]) => (
            <option key={id} value={id}>
              {title}
            </option>
          ))}
        </select>
        <input
          type="date"
          className={styles.dateInput}
          value={dateFilter}
          onChange={(e) => {
            setDateFilter(e.target.value);
            setPage(0);
          }}
          aria-label="Filter by date"
        />
        <select
          className={styles.departmentSelect}
          style={{ marginLeft: 0 }}
          value={departmentFilter}
          onChange={(e) => {
            setDepartmentFilter(e.target.value);
            setPage(0);
          }}
        >
          <option value="">All departments</option>
          {departments.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        {(employeeQuery || taskFilter || dateFilter || departmentFilter) && (
          <button
            type="button"
            className={styles.cancelButton}
            onClick={() => {
              setEmployeeQuery("");
              setTaskFilter("");
              setDateFilter("");
              setDepartmentFilter("");
              setPage(0);
            }}
          >
            Clear filters
          </button>
        )}
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Date</th>
              <th>Employee</th>
              <th>Department</th>
              <th>Hours</th>
              <th>Task</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            {pageEntries.map((entry) => {
              const emp = employeesById.get(entry.employeeId);
              return (
                <tr key={entry.id}>
                  <td className={styles.muted}>{formatDate(entry.date)}</td>
                  <td className={styles.strong}>{emp?.name ?? entry.employeeId}</td>
                  <td className={styles.muted}>{emp?.department ?? "-"}</td>
                  <td>{entry.hours}h</td>
                  <td className={styles.muted}>{entry.taskId ? taskTitles[entry.taskId] ?? "Unknown task" : "-"}</td>
                  <td>{entry.description}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {pageEntries.length === 0 && <div className={styles.empty}>No timesheet entries in this view.</div>}
      </div>
      <Pager page={page} totalPages={totalPages} onChange={setPage} />
    </div>
  );
}
