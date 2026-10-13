import type { Metadata } from "next";
import { getProjects, getTasks } from "@/lib/hr/work-store";
import { getEmployeeOverviews } from "@/lib/hr/employee-store";
import { requireCurrentEmployee } from "@/lib/auth/current-employee";
import EmployeeProjectBoard from "@/components/employee/EmployeeProjectBoard";

export const metadata: Metadata = {
  title: "Projects | HR Attendance",
};

export const dynamic = "force-dynamic";

export default async function EmployeeProjectsPage() {
  const employee = await requireCurrentEmployee();
  const [allProjects, tasks, employees] = await Promise.all([getProjects(), getTasks(), getEmployeeOverviews()]);
  const projects = allProjects.filter((p) => p.memberIds.includes(employee.id));

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 4px" }}>Projects</h1>
        <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: 0 }}>
          Projects you&apos;re a member of, with each one&apos;s task progress. HR/your manager manage project details.
        </p>
      </div>
      <EmployeeProjectBoard projects={projects} tasks={tasks} employees={employees} />
    </>
  );
}
