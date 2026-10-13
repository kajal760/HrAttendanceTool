"use client";

import { useMemo, useState } from "react";
import type { EmployeeOverview } from "@/types/hr";
import type { TimesheetEntry } from "@/types/timesheet";
import type { Project, WorkTask } from "@/types/work";
import { taskDistributionFromEntries } from "@/lib/hr/timesheets";
import styles from "../leave/Leave.module.css";

function fmtHoursValue(hours: number): string {
  return `${hours.toFixed(1)}h`;
}

interface TaskDistributionViewProps {
  entries: TimesheetEntry[];
  tasks: WorkTask[];
  projects: Project[];
  employees: EmployeeOverview[];
}

export default function TaskDistributionView({ entries, tasks, projects, employees }: TaskDistributionViewProps) {
  const [employeeFilter, setEmployeeFilter] = useState("");

  const filtered = employeeFilter ? entries.filter((e) => e.employeeId === employeeFilter) : entries;
  const rows = useMemo(() => taskDistributionFromEntries(filtered, tasks, projects), [filtered, tasks, projects]);
  const totalHours = filtered.reduce((sum, e) => sum + e.hours, 0);

  return (
    <div>
      <div className={styles.filterRow}>
        <select
          className={styles.departmentSelect}
          style={{ marginLeft: 0 }}
          value={employeeFilter}
          onChange={(e) => setEmployeeFilter(e.target.value)}
        >
          <option value="">All employees</option>
          {employees.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Task</th>
              <th>Project</th>
              <th>Hours logged</th>
              <th>Share</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.taskId ?? "unlinked"}>
                <td className={styles.strong}>{row.title}</td>
                <td className={styles.muted}>{row.projectName}</td>
                <td>{fmtHoursValue(row.hours)}</td>
                <td>{row.pct}%</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <div className={styles.empty}>No logged time in this view.</div>}
      </div>
      <p className={styles.policyHint} style={{ marginTop: 10 }}>
        {fmtHoursValue(totalHours)} logged across {filtered.length} entr{filtered.length === 1 ? "y" : "ies"}.
      </p>
    </div>
  );
}
