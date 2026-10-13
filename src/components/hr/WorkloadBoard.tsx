"use client";

import { useState } from "react";
import type { EmployeeOverview } from "@/types/hr";
import type { Project, WorkTask } from "@/types/work";
import { displayStatus } from "@/lib/work/status";
import { useDepartmentNames } from "./useDepartmentNames";
import styles from "./WorkloadBoard.module.css";

interface WorkloadBoardProps {
  tasks: WorkTask[];
  projects: Project[];
  employees: EmployeeOverview[];
}

// Per-employee breakdown uses native <details>/<summary> for expand/collapse
// so that part needs no state - but filtering (department/project/search)
// does, hence "use client".
export default function WorkloadBoard({ tasks, projects, employees }: WorkloadBoardProps) {
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  const { names: departmentNames } = useDepartmentNames();

  const employeesById = new Map(employees.map((e) => [e.id, e]));
  const projectsById = new Map(projects.map((p) => [p.id, p]));

  const memberIds = Array.from(new Set(projects.flatMap((p) => p.memberIds)));

  const allRows = memberIds
    .map((id) => {
      const employee = employeesById.get(id);
      const myTasks = tasks.filter((t) => t.assigneeIds.includes(id));
      const active = myTasks.filter((t) => t.status !== "Completed").length;
      const overdue = myTasks.filter((t) => displayStatus(t) === "Overdue").length;
      const completed = myTasks.filter((t) => t.status === "Completed").length;

      const byProject = new Map<string, { total: number; completed: number }>();
      for (const task of myTasks) {
        const entry = byProject.get(task.projectId) ?? { total: 0, completed: 0 };
        entry.total += 1;
        if (task.status === "Completed") entry.completed += 1;
        byProject.set(task.projectId, entry);
      }

      return { id, employee, active, overdue, completed, total: myTasks.length, byProject };
    })
    .sort((a, b) => b.active - a.active);

  const hasFilters = Boolean(search || departmentFilter || projectFilter);

  const searchQuery = search.trim().toLowerCase();
  const rows = allRows.filter((row) => {
    if (searchQuery && !(row.employee?.name.toLowerCase().includes(searchQuery) ?? false)) return false;
    if (departmentFilter && row.employee?.department !== departmentFilter) return false;
    if (projectFilter && !row.byProject.has(projectFilter)) return false;
    return true;
  });

  return (
    <div>
      <div className={styles.filterBar}>
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Search employee..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className={styles.filterSelect}
          value={departmentFilter}
          onChange={(e) => setDepartmentFilter(e.target.value)}
          aria-label="Filter by department"
        >
          <option value="">All departments</option>
          {departmentNames.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
        <select
          className={styles.filterSelect}
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          aria-label="Filter by project"
        >
          <option value="">All projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        {hasFilters && (
          <button
            type="button"
            className={styles.clearFilters}
            onClick={() => {
              setSearch("");
              setDepartmentFilter("");
              setProjectFilter("");
            }}
          >
            Clear filters
          </button>
        )}
      </div>

      <div className={styles.list}>
      {rows.length === 0 && (
        <p className={styles.empty}>{allRows.length === 0 ? "No project members yet." : "No one matches these filters."}</p>
      )}
      {rows.map((row) => (
        <details className={styles.card} key={row.id}>
          <summary className={styles.summary}>
            <span className={styles.name}>{row.employee?.name ?? row.id}</span>
            <span className={styles.stat}>
              <strong>{row.active}</strong> active
            </span>
            <span className={`${styles.stat} ${row.overdue > 0 ? styles.overdueStat : ""}`}>
              <strong>{row.overdue}</strong> overdue
            </span>
            <span className={styles.stat}>
              <strong>{row.completed}</strong> completed
            </span>
            <span className={styles.stat}>
              <strong>{row.total}</strong> total
            </span>
          </summary>
          <div className={styles.breakdown}>
            <span className={styles.breakdownTitle}>Contribution by project</span>
            {Array.from(row.byProject.entries()).map(([projectId, stat]) => {
              const pct = stat.total === 0 ? 0 : Math.round((stat.completed / stat.total) * 100);
              return (
                <div className={styles.projectRow} key={projectId}>
                  <span className={styles.projectName}>{projectsById.get(projectId)?.name ?? projectId}</span>
                  <div className={styles.track}>
                    <div className={styles.fill} style={{ width: `${pct}%` }} />
                  </div>
                  <span className={styles.projectStat}>
                    {stat.completed}/{stat.total}
                  </span>
                </div>
              );
            })}
          </div>
        </details>
      ))}
      </div>
    </div>
  );
}
