"use client";

import { useMemo } from "react";
import type { EmployeeOverview } from "@/types/hr";
import type { Project, WorkTask } from "@/types/work";
import { displayStatus } from "@/lib/work/status";
import styles from "./EmployeeProjectBoard.module.css";

interface EmployeeProjectBoardProps {
  projects: Project[];
  tasks: WorkTask[];
  employees: EmployeeOverview[];
}

function formatDeadline(date: string): string {
  return new Date(date).toLocaleDateString("en-GB", { month: "short", day: "numeric", year: "numeric" });
}

// View-only counterpart to HR's `ProjectBoard` - same card layout (name,
// description, task/completed/overdue counts, deadline, department, member
// chips), minus every edit action. Only shows projects the signed-in
// employee is a member of (filtered by the page before this renders).
export default function EmployeeProjectBoard({ projects, tasks, employees }: EmployeeProjectBoardProps) {
  const employeesById = useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees]);

  const tasksByProject = useMemo(() => {
    const map = new Map<string, WorkTask[]>();
    for (const task of tasks) {
      const list = map.get(task.projectId) ?? [];
      list.push(task);
      map.set(task.projectId, list);
    }
    return map;
  }, [tasks]);

  const namesOf = (ids: string[]) => ids.map((id) => employeesById.get(id)?.name ?? id);

  if (projects.length === 0) {
    return <p className={styles.empty}>You're not a member of any project yet.</p>;
  }

  return (
    <div className={styles.grid}>
      {projects.map((project) => {
        const projectTasks = tasksByProject.get(project.id) ?? [];
        const completed = projectTasks.filter((t) => t.status === "Completed").length;
        const overdue = projectTasks.filter((t) => displayStatus(t) === "Overdue").length;

        return (
          <div className={styles.card} key={project.id}>
            <h3 className={styles.name}>{project.name}</h3>
            {project.description && <p className={styles.description}>{project.description}</p>}

            <div className={styles.metaRow}>
              <span>{projectTasks.length} tasks</span>
              <span>&middot;</span>
              <span>{completed} completed</span>
              {overdue > 0 && (
                <>
                  <span>&middot;</span>
                  <span className={styles.overdue}>{overdue} overdue</span>
                </>
              )}
              {project.deadline && (
                <>
                  <span>&middot;</span>
                  <span>Due {formatDeadline(project.deadline)}</span>
                </>
              )}
            </div>

            <div className={styles.assignment}>
              <div className={styles.assignRow}>
                <span className={styles.assignLabel}>Department</span>
                <span className={styles.assignValue}>{project.departmentName ?? "Not set"}</span>
              </div>
              <div className={styles.assignRow}>
                <span className={styles.assignLabel}>Team</span>
                <span className={styles.chips}>
                  {namesOf(project.memberIds).map((n) => (
                    <span key={n} className={styles.chip}>
                      {n}
                    </span>
                  ))}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
