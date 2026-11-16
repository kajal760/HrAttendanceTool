"use client";

import { useMemo, useState } from "react";
import type { EmployeeOverview } from "@/types/hr";
import { LEAVE_WARNING_THRESHOLD } from "@/lib/hr/leave-balance";
import Pager from "@/components/employee/Pager";
import styles from "./Leave.module.css";

const PAGE_SIZE = 10;

// One employee's paid-leave totals for the year, as computed by the backend.
export interface LeaveTotalsRow {
  employeeId: string;
  totalAllocated: number;
  totalUsed: number;
  totalRemaining: number;
  percentUsed: number;
}

interface LeaveBalanceTableProps {
  totals: LeaveTotalsRow[];
  employees: EmployeeOverview[];
}

const NO_LEAVE = { totalAllocated: 0, totalUsed: 0, totalRemaining: 0, percentUsed: 0 };

export default function LeaveBalanceTable({ totals, employees }: LeaveBalanceTableProps) {
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [page, setPage] = useState(0);

  const departments = useMemo(() => Array.from(new Set(employees.map((e) => e.department))).sort(), [employees]);

  const rows = useMemo(() => {
    const byEmployee = new Map(totals.map((t) => [t.employeeId, t]));
    const query = employeeSearch.trim().toLowerCase();
    return employees
      .filter(
        (e) =>
          !e.deactivated &&
          (!departmentFilter || e.department === departmentFilter) &&
          (!query || e.name.toLowerCase().includes(query)),
      )
      .map((e) => ({ employee: e, leave: byEmployee.get(e.id) ?? NO_LEAVE }))
      .sort((a, b) => a.employee.name.localeCompare(b.employee.name));
  }, [employees, totals, departmentFilter, employeeSearch]);

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const pageRows = rows.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  const nearLimitCount = rows.filter((r) => r.leave.percentUsed >= LEAVE_WARNING_THRESHOLD).length;

  return (
    <div>
      {nearLimitCount > 0 && (
        <p className={styles.usageSummary}>
          {nearLimitCount} {nearLimitCount === 1 ? "employee has" : "employees have"} used {LEAVE_WARNING_THRESHOLD}% or more
          of their annual leave allocation.
        </p>
      )}
      <div className={styles.filterRow}>
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Search by employee..."
          value={employeeSearch}
          onChange={(e) => {
            setEmployeeSearch(e.target.value);
            setPage(0);
          }}
        />
        <select
          className={styles.departmentSelect}
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
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Employee</th>
              <th>Department</th>
              <th>Allocated</th>
              <th>Used</th>
              <th>Remaining</th>
              <th>% Used</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map(({ employee, leave }) => (
              <tr key={employee.id} className={leave.percentUsed >= LEAVE_WARNING_THRESHOLD ? styles.rowWarning : undefined}>
                <td className={styles.strong}>{employee.name}</td>
                <td className={styles.muted}>{employee.department}</td>
                <td>{leave.totalAllocated}</td>
                <td>{leave.totalUsed}</td>
                <td className={styles.strong}>{leave.totalRemaining}</td>
                <td className={styles.strong}>{leave.percentUsed}%</td>
              </tr>
            ))}
          </tbody>
        </table>
        {pageRows.length === 0 && <div className={styles.empty}>No employees in this view.</div>}
      </div>
      <Pager page={page} totalPages={totalPages} onChange={setPage} />
    </div>
  );
}
