// Timesheet calculations shared by the Timesheets page. Client-safe: no server
// imports, so the page can filter, sort, and chart without a reload.

import type { DailyRecord } from "@/lib/hr/attendance-daily";
import type { TimesheetEntry } from "@/types/timesheet";
import type { Project, WorkTask } from "@/types/work";

export type TimesheetStatus = "Complete" | "In Progress" | "Incomplete" | "Correction Pending";

export function timesheetStatus(r: DailyRecord, pendingKeys: Set<string>): TimesheetStatus {
  if (pendingKeys.has(`${r.employeeId}|${r.date}`)) return "Correction Pending";
  if (r.status === "Absent") return "Incomplete";
  if (r.checkIn && !r.checkOut) return "In Progress";
  if (r.checkIn && r.checkOut) return "Complete";
  return "Incomplete";
}

// Gross time on site (check-in to check-out). Unknown while still working.
export function grossMin(r: DailyRecord): number | null {
  return r.checkIn && r.workingMin !== null ? r.workingMin + r.breakMin : null;
}

// Net working time: gross minus breaks.
export function netMin(r: DailyRecord): number | null {
  return r.checkIn ? r.workingMin : null;
}

export function fmtHm(min: number | null | undefined): string {
  if (min === null || min === undefined) return "-";
  return `${Math.floor(min / 60)}h ${String(min % 60).padStart(2, "0")}m`;
}

export function fmtHours(min: number): string {
  return `${(min / 60).toFixed(1)}h`;
}

export interface RealTaskShare {
  taskId?: string; // absent for the "Unlinked" bucket
  title: string;
  projectName: string;
  hours: number;
  pct: number;
}

// Real logged hours (from `TimesheetEntry.hours`/`taskId`), grouped by task
// then project, with an "Unlinked" bucket for entries with no task - this
// replaces the old per-employee synthetic estimate that used to live here.
export function taskDistributionFromEntries(
  entries: TimesheetEntry[],
  tasks: WorkTask[],
  projects: Project[],
): RealTaskShare[] {
  const tasksById = new Map(tasks.map((t) => [t.id, t]));
  const projectsById = new Map(projects.map((p) => [p.id, p]));
  const totalHours = entries.reduce((sum, e) => sum + e.hours, 0);

  const byKey = new Map<string, number>();
  for (const e of entries) {
    const key = e.taskId ?? "unlinked";
    byKey.set(key, (byKey.get(key) ?? 0) + e.hours);
  }

  const pct = (hours: number) => (totalHours > 0 ? Math.round((hours / totalHours) * 1000) / 10 : 0);

  const rows: RealTaskShare[] = Array.from(byKey.entries()).map(([key, hours]) => {
    if (key === "unlinked") {
      return { title: "Unlinked", projectName: "-", hours, pct: pct(hours) };
    }
    const task = tasksById.get(key);
    return {
      taskId: key,
      title: task?.title ?? "Unknown task",
      projectName: task ? projectsById.get(task.projectId)?.name ?? "Unlinked project" : "-",
      hours,
      pct: pct(hours),
    };
  });

  return rows.sort((a, b) => b.hours - a.hours);
}
