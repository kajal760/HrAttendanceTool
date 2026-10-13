import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDepartment } from "@/lib/hr/department-store";
import { getEmployeeOverviews } from "@/lib/hr/employee-store";
import { getProjects, getTasks } from "@/lib/hr/work-store";
import { getSystemLogs } from "@/lib/superadmin/log-store";
import { projectStatus } from "@/lib/work/status";
import DepartmentDetailView from "@/components/hr/DepartmentDetailView";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const department = await getDepartment(id);
  return { title: department ? `${department.name} | HR Attendance` : "Department | HR Attendance" };
}

export const dynamic = "force-dynamic";

export default async function DepartmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const department = await getDepartment(id);
  if (!department) notFound();

  const [employees, projects, tasks, logs] = await Promise.all([
    getEmployeeOverviews(),
    getProjects(),
    getTasks(),
    getSystemLogs(),
  ]);

  const members = employees.filter((e) => e.department === department.name);
  const otherEmployees = employees.filter((e) => e.department !== department.name);
  const memberIds = new Set(members.map((m) => m.id));
  const deptProjects = projects
    .filter((p) => p.memberIds.some((mid) => memberIds.has(mid)))
    .map((p) => ({ ...p, status: projectStatus(p, tasks) }));
  const deptLogs = logs.filter((l) => l.department === department.name);

  return (
    <DepartmentDetailView
      department={department}
      members={members}
      otherEmployees={otherEmployees}
      projects={deptProjects}
      logs={deptLogs}
    />
  );
}
