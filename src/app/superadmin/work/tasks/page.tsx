import type { Metadata } from "next";
import { getProjects, getTasks } from "@/lib/hr/work-store";
import { getEmployeeOverviews } from "@/lib/hr/employee-store";
import TaskBoard from "@/components/hr/TaskBoard";
import WorkViewToggle from "@/components/hr/WorkViewToggle";
import WorkTable from "@/components/hr/WorkTable";

export const metadata: Metadata = {
  title: "Tasks | HR Attendance",
};

export default async function SuperAdminWorkTasksPage() {
  const [tasks, projects, employees] = await Promise.all([
    getTasks(),
    getProjects(),
    getEmployeeOverviews(),
  ]);

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 4px" }}>Tasks</h1>
        <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: 0 }}>
          Assign tasks with deadlines and track Pending / Ongoing / Completed / Overdue.
        </p>
      </div>
      <WorkViewToggle
        board={<TaskBoard tasks={tasks} projects={projects} employees={employees} />}
        table={<WorkTable kind="tasks" projects={projects} tasks={tasks} employees={employees} />}
      />
    </>
  );
}
