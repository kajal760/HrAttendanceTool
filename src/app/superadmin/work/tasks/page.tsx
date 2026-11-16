import type { Metadata } from "next";
import { ListTodo, Loader, CheckCircle2, AlertTriangle } from "lucide-react";
import { getProjects, getTasks } from "@/lib/hr/work-store";
import { getEmployeeOverviews } from "@/lib/hr/employee-store";
import { isOverdue } from "@/lib/work/status";
import TaskBoard from "@/components/hr/TaskBoard";
import WorkViewToggle from "@/components/hr/WorkViewToggle";
import WorkTable from "@/components/hr/WorkTable";
import StatTile from "@/components/hr/StatTile";
import TodaysTasksList from "@/components/hr/TodaysTasksList";
import SectionCard from "@/components/employee/SectionCard";
import styles from "@/components/hr/lifecycle/Lifecycle.module.css";

export const metadata: Metadata = {
  title: "Tasks | HumSetu",
};

export const dynamic = "force-dynamic";

function todayIso(): string {
  return new Date().toLocaleDateString("en-CA");
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default async function SuperAdminWorkTasksPage() {
  const [tasks, projects, employees] = await Promise.all([
    getTasks(),
    getProjects(),
    getEmployeeOverviews(),
  ]);

  const projectsById = new Map(projects.map((p) => [p.id, p]));
  const employeesById = new Map(employees.map((e) => [e.id, e]));

  const total = tasks.length;
  const inProgress = tasks.filter((t) => t.status === "Ongoing").length;
  const completed = tasks.filter((t) => t.status === "Completed").length;
  const overdueCount = tasks.filter((t) => isOverdue(t)).length;

  const today = todayIso();
  const in7Days = new Date();
  in7Days.setDate(in7Days.getDate() + 7);
  const in7DaysIso = in7Days.toLocaleDateString("en-CA");

  const todaysTasks = tasks
    .filter((t) => t.deadline === today)
    .map((t) => ({ ...t, projectName: projectsById.get(t.projectId)?.name ?? "Unassigned project" }));

  const upcoming = [...tasks]
    .filter((t) => t.deadline > today && t.deadline <= in7DaysIso && t.status !== "Completed")
    .sort((a, b) => (a.deadline < b.deadline ? -1 : 1))
    .slice(0, 6);

  const priorityCounts = { High: 0, Medium: 0, Low: 0 } as Record<"High" | "Medium" | "Low", number>;
  for (const t of tasks) priorityCounts[t.priority]++;
  const priorityTotal = Math.max(1, total);

  const workloadMap = new Map<string, number>();
  for (const t of tasks) {
    if (t.status === "Completed") continue;
    for (const id of t.assigneeIds) workloadMap.set(id, (workloadMap.get(id) ?? 0) + 1);
  }
  const workload = Array.from(workloadMap.entries())
    .map(([id, count]) => ({ id, name: employeesById.get(id)?.name ?? id, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
  const maxWorkload = Math.max(1, ...workload.map((w) => w.count));

  const recentActivity = [...tasks].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1)).slice(0, 6);

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 4px" }}>Tasks</h1>
        <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: 0 }}>
          Drag a card to change its status, or switch to the table for bulk editing.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 14, marginBottom: 18 }}>
        <StatTile label="Total Tasks" value={total} icon={ListTodo} tone="accent" />
        <StatTile label="In Progress" value={inProgress} icon={Loader} tone="info" />
        <StatTile label="Completed" value={completed} icon={CheckCircle2} tone="success" />
        <StatTile label="Overdue" value={overdueCount} icon={AlertTriangle} tone="danger" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 300px", gap: 16, alignItems: "start", marginBottom: 18 }}>
        <WorkViewToggle
          board={<TaskBoard tasks={tasks} projects={projects} employees={employees} />}
          table={<WorkTable kind="tasks" projects={projects} tasks={tasks} employees={employees} />}
        />

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <SectionCard title="Today's Tasks">
            <TodaysTasksList tasks={todaysTasks} />
          </SectionCard>

          <SectionCard title="Upcoming" subtitle="Next 7 days">
            {upcoming.length === 0 ? (
              <p style={{ fontSize: 13, color: "var(--color-text-muted)" }}>Nothing due soon.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {upcoming.map((t) => (
                  <div key={t.id} style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 12.5 }}>
                    <span style={{ fontWeight: 600 }}>{t.title}</span>
                    <span className={styles.muted}>{formatDate(t.deadline)}</span>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard title="Priority Overview">
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {(["High", "Medium", "Low"] as const).map((p) => (
                <div key={p}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                    <span>{p}</span>
                    <span className={styles.muted}>{priorityCounts[p]}</span>
                  </div>
                  <div className={styles.progressTrack}>
                    <div
                      className={styles.progressFill}
                      style={{
                        width: `${Math.round((priorityCounts[p] / priorityTotal) * 100)}%`,
                        background:
                          p === "High" ? "var(--color-danger)" : p === "Medium" ? "var(--color-warning)" : "var(--color-info)",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 16 }}>
        <SectionCard title="Team Workload" subtitle="Active (non-completed) tasks per person">
          {workload.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--color-text-muted)" }}>No active tasks assigned.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {workload.map((w) => (
                <div key={w.id}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                    <span style={{ fontWeight: 600 }}>{w.name}</span>
                    <span className={styles.muted}>{w.count} active</span>
                  </div>
                  <div className={styles.progressTrack}>
                    <div className={styles.progressFill} style={{ width: `${Math.round((w.count / maxWorkload) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Recent Activity" subtitle="Most recently updated tasks">
          {recentActivity.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--color-text-muted)" }}>No task activity yet.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {recentActivity.map((t) => (
                <div key={t.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 12.5 }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{t.title}</div>
                    <div className={styles.muted}>{t.status}</div>
                  </div>
                  <span className={styles.muted}>{formatDate(t.updatedAt)}</span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </>
  );
}
