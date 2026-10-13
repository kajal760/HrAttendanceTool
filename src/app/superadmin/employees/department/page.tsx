import type { Metadata } from "next";
import { getDepartments } from "@/lib/hr/department-store";
import { getEmployeeOverviews } from "@/lib/hr/employee-store";
import { getProjects } from "@/lib/hr/work-store";
import DepartmentGrid, { type DepartmentSummary } from "@/components/hr/DepartmentGrid";

export const metadata: Metadata = {
  title: "Departments | HR Attendance",
};

export const dynamic = "force-dynamic";

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((sum, v) => sum + v, 0) / values.length);
}

export default async function DepartmentPage() {
  const [departments, employees, projects] = await Promise.all([
    getDepartments(),
    getEmployeeOverviews(),
    getProjects(),
  ]);

  const employeesById = new Map(employees.map((e) => [e.id, e]));

  const summaries: DepartmentSummary[] = departments.map((department) => {
    const members = employees.filter((e) => e.department === department.name);
    const memberIds = new Set(members.map((m) => m.id));
    const projectCount = projects.filter((p) => p.memberIds.some((id) => memberIds.has(id))).length;

    return {
      ...department,
      headName: department.headId ? employeesById.get(department.headId)?.name : undefined,
      employeeCount: members.length,
      attendancePct: average(members.map((m) => m.attendancePct)),
      performancePct: average(members.map((m) => m.performanceScore)),
      projectCount,
    };
  });

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 4px" }}>Departments</h1>
        <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: 0 }}>
          Headcount, head, attendance, performance, and projects for every department - click one for the full breakdown.
        </p>
      </div>
      <DepartmentGrid departments={summaries} employees={employees} />
    </>
  );
}
