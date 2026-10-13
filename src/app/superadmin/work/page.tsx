import type { Metadata } from "next";
import { getProjects, getTasks } from "@/lib/hr/work-store";
import { getEmployeeOverviews } from "@/lib/hr/employee-store";
import ProjectBoard from "@/components/hr/ProjectBoard";
import WorkViewToggle from "@/components/hr/WorkViewToggle";
import WorkTable from "@/components/hr/WorkTable";

export const metadata: Metadata = {
  title: "Projects | HR Attendance",
};

export default async function SuperAdminWorkPage() {
  const [projects, tasks, employees] = await Promise.all([
    getProjects(),
    getTasks(),
    getEmployeeOverviews(),
  ]);

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 4px" }}>Projects</h1>
        <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: 0 }}>
          Assign a department and people to each project, then review projects, tasks, and workload.
        </p>
      </div>
      <WorkViewToggle
        board={<ProjectBoard projects={projects} tasks={tasks} employees={employees} />}
        table={<WorkTable kind="projects" projects={projects} tasks={tasks} employees={employees} />}
      />
    </>
  );
}
