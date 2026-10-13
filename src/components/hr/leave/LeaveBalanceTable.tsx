"use client";

import { useMemo, useState } from "react";
import type { EmployeeOverview } from "@/types/hr";
import type { LeaveRequest } from "@/types/employee";
import { computeBalances } from "@/lib/hr/leave-balance";
import Pager from "@/components/employee/Pager";
import styles from "./Leave.module.css";

const PAGE_SIZE = 10;

interface LeaveBalanceTableProps {
  requests: LeaveRequest[];
  employees: EmployeeOverview[];
  leaveYearStart: string;
}

export default function LeaveBalanceTable({ requests, employees, leaveYearStart }: LeaveBalanceTableProps) {
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [page, setPage] = useState(0);

  const departments = useMemo(() => Array.from(new Set(employees.map((e) => e.department))).sort(), [employees]);

  const rows = useMemo(
    () =>
      employees
        .filter((e) => !departmentFilter || e.department === departmentFilter)
        .map((e) => ({ employee: e, leave: computeBalances(requests, e.id, leaveYearStart) }))
        .sort((a, b) => a.employee.name.localeCompare(b.employee.name)),
    [employees, requests, leaveYearStart, departmentFilter],
  );

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const pageRows = rows.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  return (
    <div>
      <div className={styles.filterRow}>
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
            </tr>
          </thead>
          <tbody>
            {pageRows.map(({ employee, leave }) => (
              <tr key={employee.id}>
                <td className={styles.strong}>{employee.name}</td>
                <td className={styles.muted}>{employee.department}</td>
                <td>{leave.totalAllocated}</td>
                <td>{leave.totalUsed}</td>
                <td className={styles.strong}>{leave.totalRemaining}</td>
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
