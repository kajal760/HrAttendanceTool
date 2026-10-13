"use client";

import Link from "next/link";
import type { DepartmentOverviewRow } from "@/types/hr";
import { withBase } from "@/lib/portal";
import { usePortalBase } from "./usePortalBase";
import styles from "./DepartmentOverviewTable.module.css";

interface DepartmentOverviewTableProps {
  rows: DepartmentOverviewRow[];
}

// Read-only rollup, computed live from each employee's attendance/
// performance numbers - clicking a row jumps to the Employees grid
// pre-filtered to that department (`?department=`), which is as close to a
// "Department 360" drill-down as exists in this app today.
export default function DepartmentOverviewTable({ rows }: DepartmentOverviewTableProps) {
  const base = usePortalBase();
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Department</th>
            <th>Employees</th>
            <th>Attendance</th>
            <th>Performance</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.name}>
              <td>
                <Link
                  href={withBase(base, `/employees?department=${encodeURIComponent(row.name)}`)}
                  className={styles.deptLink}
                >
                  {row.name}
                </Link>
              </td>
              <td>{row.employeeCount}</td>
              <td>{row.attendancePct}%</td>
              <td>{row.performancePct}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
