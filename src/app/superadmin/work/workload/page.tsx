import type { Metadata } from "next";
import { getProjects, getTasks } from "@/lib/hr/work-store";
import { getEmployeeOverviews } from "@/lib/hr/employee-store";
import WorkloadBoard from "@/components/hr/WorkloadBoard";
import WorkViewToggle from "@/components/hr/WorkViewToggle";
import WorkTable from "@/components/hr/WorkTable";

export const metadata: Metadata = {
  title: "Workload | HR Attendance",
};

export default async function SuperAdminWorkloadPage() {
  const [tasks, projects, employees] = await Promise.all([
    getTasks(),
    getProjects(),
    getEmployeeOverviews(),
  ]);

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 4px" }}>Workload</h1>
        <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: 0 }}>
          How many active tasks each person is juggling, and what they&apos;ve contributed per project.
        </p>
      </div>
      <WorkViewToggle
        board={<WorkloadBoard tasks={tasks} projects={projects} employees={employees} />}
        table={<WorkTable kind="workload" projects={projects} tasks={tasks} employees={employees} />}
      />
    </>
  );
}
