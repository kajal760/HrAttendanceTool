import type { Metadata } from "next";
import { FolderKanban, Loader, CheckCircle2, AlertTriangle } from "lucide-react";
import { getProjects, getTasks } from "@/lib/hr/work-store";
import { getEmployeeOverviews } from "@/lib/hr/employee-store";
import { projectStatus } from "@/lib/work/status";
import ProjectBoard from "@/components/hr/ProjectBoard";
import WorkViewToggle from "@/components/hr/WorkViewToggle";
import WorkTable from "@/components/hr/WorkTable";
import StatTile from "@/components/hr/StatTile";

export const metadata: Metadata = {
  title: "Projects | HumSetu",
};

export const dynamic = "force-dynamic";

export default async function SuperAdminWorkPage() {
  const [projects, tasks, employees] = await Promise.all([
    getProjects(),
    getTasks(),
    getEmployeeOverviews(),
  ]);

  const statuses = projects.map((p) => projectStatus(p, tasks));
  const active = statuses.filter((s) => s === "Active").length;
  const completed = statuses.filter((s) => s === "Completed").length;
  const delayed = statuses.filter((s) => s === "Delayed").length;

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 4px" }}>Projects</h1>
        <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: 0 }}>
          Assign a department and people to each project, then review projects, tasks, and workload.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 14, marginBottom: 18 }}>
        <StatTile label="Total Projects" value={projects.length} icon={FolderKanban} tone="accent" />
        <StatTile label="Active" value={active} icon={Loader} tone="info" />
        <StatTile label="Completed" value={completed} icon={CheckCircle2} tone="success" />
        <StatTile label="At Risk (Delayed)" value={delayed} icon={AlertTriangle} tone="danger" />
      </div>

      <WorkViewToggle
        board={<ProjectBoard projects={projects} tasks={tasks} employees={employees} />}
        table={<WorkTable kind="projects" projects={projects} tasks={tasks} employees={employees} />}
      />
    </>
  );
}
