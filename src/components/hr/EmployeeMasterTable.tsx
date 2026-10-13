"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { EmployeeOverview } from "@/types/hr";
import { withBase } from "@/lib/portal";
import { usePortalBase } from "./usePortalBase";
import Pager from "@/components/employee/Pager";
import styles from "./leave/Leave.module.css";

const PAGE_SIZE = 15;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

interface EmployeeMasterTableProps {
  employees: EmployeeOverview[];
}

// A flat, data-dense view over the same Employee Master record as the
// Directory's cards - every field the BRD lists (personal, contact,
// emergency, education, experience, joining, status, department,
// designation, manager, location) lives on the full record at
// `/employees/[id]`; this table is the fast way to scan and jump to it.
export default function EmployeeMasterTable({ employees }: EmployeeMasterTableProps) {
  const base = usePortalBase();
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);

  const employeesById = useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.employeeCode.toLowerCase().includes(q) ||
        e.department.toLowerCase().includes(q) ||
        e.designation.toLowerCase().includes(q),
    );
  }, [employees, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageEmployees = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  return (
    <div>
      <div className={styles.filterRow}>
        <input
          type="text"
          className={styles.departmentSelect}
          style={{ marginLeft: 0, minWidth: 240 }}
          placeholder="Search name, code, department, or designation..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(0);
          }}
        />
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>Department</th>
              <th>Designation</th>
              <th>Manager</th>
              <th>Status</th>
              <th>Joined</th>
            </tr>
          </thead>
          <tbody>
            {pageEmployees.map((e) => (
              <tr key={e.id}>
                <td className={styles.muted}>{e.employeeCode}</td>
                <td className={styles.strong}>
                  <Link href={withBase(base, `/employees/${e.id}`)}>{e.name}</Link>
                </td>
                <td>{e.department}</td>
                <td className={styles.muted}>{e.designation}</td>
                <td className={styles.muted}>{e.managerId ? employeesById.get(e.managerId)?.name ?? "-" : "-"}</td>
                <td>{e.status}</td>
                <td className={styles.muted}>{formatDate(e.joinedOn)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {pageEmployees.length === 0 && <div className={styles.empty}>No employees match this search.</div>}
      </div>
      <Pager page={page} totalPages={totalPages} onChange={setPage} />
    </div>
  );
}
