import type { Metadata } from "next";
import { getProjects, getTasks, getTasksForEmployee } from "@/lib/hr/work-store";
import { getEmployeeOverviews } from "@/lib/hr/employee-store";
import { requireCurrentEmployee } from "@/lib/auth/current-employee";
import { findTasksBlockedByMine, resolveTasksWithProject } from "@/lib/employee/task-dependencies";
import TaskDependenciesView from "@/components/employee/TaskDependenciesView";

export const metadata: Metadata = {
  title: "Dependencies | HR Attendance",
};

export const dynamic = "force-dynamic";

export default async function EmployeeTaskDependenciesPage() {
  const employee = await requireCurrentEmployee();
  const [myTasks, allTasks, projects, employees] = await Promise.all([
    getTasksForEmployee(employee.id),
    getTasks(),
    getProjects(),
    getEmployeeOverviews(),
  ]);

  const resolved = resolveTasksWithProject(myTasks, allTasks, projects);
  const blocked = resolved.filter((t) => t.dependsOnTask && t.dependsOnTask.status !== "Completed");
  const blocking = findTasksBlockedByMine(myTasks, allTasks);

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 4px" }}>Dependencies</h1>
        <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: 0 }}>
          Prerequisite tasks and blocked tasks across everything assigned to you.
        </p>
      </div>
      <TaskDependenciesView blocked={blocked} blocking={blocking} employees={employees} />
    </>
  );
}
