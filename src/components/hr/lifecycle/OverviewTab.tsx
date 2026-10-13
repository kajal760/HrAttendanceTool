"use client";

import { useMemo, useState } from "react";
import type { EmployeeOverview, EmployeeStatus } from "@/types/hr";
import { currentStage, LIFECYCLE_STAGES, type LifecycleStage } from "./stage";
import { EMPLOYEE_STATUS_TONE, toneClass } from "./badge-tones";
import styles from "./Lifecycle.module.css";
import { useDepartmentNames } from "../useDepartmentNames";

const STATUS_VALUES: EmployeeStatus[] = [
  "Onboarding",
  "Probation",
  "Active",
  "On Leave",
  "Notice Period",
  "Resigned",
  "Exited",
];

function formatDate(iso?: string): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("en-GB", { month: "short", day: "numeric", year: "numeric" });
}

interface ManagerOption {
  id: string;
  name: string;
}

interface OverviewTabProps {
  employees: EmployeeOverview[];
  managerOptions: ManagerOption[];
  onViewLifecycle: (id: string) => void;
}

export default function OverviewTab({ employees, managerOptions, onViewLifecycle }: OverviewTabProps) {
  const [query, setQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<EmployeeStatus | "">("");
  const [stageFilter, setStageFilter] = useState<LifecycleStage | "">("");
  const [managerFilter, setManagerFilter] = useState("");
  const [joinedFrom, setJoinedFrom] = useState("");
  const [joinedTo, setJoinedTo] = useState("");

  const departments = useDepartmentNames().names;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return employees.filter((e) => {
      if (q && !(e.name.toLowerCase().includes(q) || e.employeeCode.toLowerCase().includes(q) || e.department.toLowerCase().includes(q) || e.designation.toLowerCase().includes(q))) {
        return false;
      }
      if (departmentFilter && e.department !== departmentFilter) return false;
      if (statusFilter && e.status !== statusFilter) return false;
      if (stageFilter && currentStage(e) !== stageFilter) return false;
      if (managerFilter && e.managerId !== managerFilter) return false;
      if (joinedFrom && e.joinedOn < joinedFrom) return false;
      if (joinedTo && e.joinedOn > joinedTo) return false;
      return true;
    });
  }, [employees, query, departmentFilter, statusFilter, stageFilter, managerFilter, joinedFrom, joinedTo]);

  return (
    <div>
      <div className={styles.toolbar}>
        <input
          type="text"
          placeholder="Search employee by name, employee ID, department or designation"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className={styles.searchInput}
        />
        <select className={styles.filterSelect} value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)} aria-label="Filter by department">
          <option value="">All departments</option>
          {departments.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
        <select className={styles.filterSelect} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as EmployeeStatus | "")} aria-label="Filter by employment status">
          <option value="">All statuses</option>
          {STATUS_VALUES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select className={styles.filterSelect} value={stageFilter} onChange={(e) => setStageFilter(e.target.value as LifecycleStage | "")} aria-label="Filter by lifecycle stage">
          <option value="">All stages</option>
          {LIFECYCLE_STAGES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select className={styles.filterSelect} value={managerFilter} onChange={(e) => setManagerFilter(e.target.value)} aria-label="Filter by manager">
          <option value="">All managers</option>
          {managerOptions.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
        <label className={styles.hint}>
          Joined from{" "}
          <input type="date" value={joinedFrom} onChange={(e) => setJoinedFrom(e.target.value)} className={styles.filterSelect} />
        </label>
        <label className={styles.hint}>
          to{" "}
          <input type="date" value={joinedTo} onChange={(e) => setJoinedTo(e.target.value)} className={styles.filterSelect} />
        </label>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Employee</th>
              <th>Department</th>
              <th>Designation</th>
              <th>Current Stage</th>
              <th>Joining Date</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {filtered.map((e) => (
              <tr key={e.id}>
                <td>
                  <span style={{ fontWeight: 600 }}>{e.name}</span>
                  <div className={styles.muted}>{e.employeeCode}</div>
                </td>
                <td>{e.department}</td>
                <td>{e.designation}</td>
                <td>{currentStage(e)}</td>
                <td>{formatDate(e.joinedOn)}</td>
                <td>
                  <span className={toneClass(styles, EMPLOYEE_STATUS_TONE[e.status])}>{e.status}</span>
                </td>
                <td>
                  <button type="button" className={styles.actionButton} onClick={() => onViewLifecycle(e.id)}>
                    View Lifecycle
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className={styles.empty}>No employees match these filters.</div>}
      </div>
    </div>
  );
}
