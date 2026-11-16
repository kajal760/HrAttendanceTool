import type { Metadata } from "next";
import { Clock, BarChart3, Coffee, Users } from "lucide-react";
import { getRangeRecords, resolvePeriod } from "@/lib/hr/attendance-daily";
import { getTimesheetEntries } from "@/lib/hr/timesheet-store";
import { getEmployeeOverviews } from "@/lib/hr/employee-store";
import { getTasks, getProjects } from "@/lib/hr/work-store";
import { fmtDuration } from "@/lib/hr/attendance-format";
import TimesheetPeriodFilter from "@/components/hr/timesheets/TimesheetPeriodFilter";
import TimesheetOverviewTable, { type TimesheetRow } from "@/components/hr/timesheets/TimesheetOverviewTable";
import StatTile from "@/components/hr/StatTile";

export const metadata: Metadata = {
  title: "Timesheet Overview | HumSetu",
};

export const dynamic = "force-dynamic";

type SearchParams = { period?: string; date?: string; from?: string; to?: string };

export default async function TimesheetOverviewPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const raw = await searchParams;
  const period = resolvePeriod({ ...raw, period: raw.period ?? "week" });

  const [records, entries, employees, tasks, projects] = await Promise.all([
    getRangeRecords(period.from, period.to),
    getTimesheetEntries({ from: period.from, to: period.to }),
    getEmployeeOverviews(),
    getTasks(),
    getProjects(),
  ]);

  // Leave days aren't working time - same convention the old "Working Hours
  // & Breaks" page used.
  const working = records.filter((r) => r.status !== "On Leave");

  const projectsById = new Map(projects.map((p) => [p.id, p]));
  const tasksById = new Map(tasks.map((t) => [t.id, t]));
  const entriesByEmployeeDate = new Map<string, typeof entries>();
  for (const e of entries) {
    const key = `${e.employeeId}|${e.date}`;
    const list = entriesByEmployeeDate.get(key) ?? [];
    list.push(e);
    entriesByEmployeeDate.set(key, list);
  }

  // One row per (employee, date, task) when the employee logged task time
  // that day, enriched with their attendance for the same day; a plain
  // attendance row (no project/task) when they clocked in but logged none -
  // attendance is never dropped just because no task was recorded.
  const rows: TimesheetRow[] = [];
  for (const r of working) {
    const dayEntries = entriesByEmployeeDate.get(`${r.employeeId}|${r.date}`) ?? [];
    if (dayEntries.length === 0) {
      rows.push({
        id: `${r.employeeId}-${r.date}`,
        employeeId: r.employeeId,
        employeeName: r.name,
        department: r.department,
        date: r.date,
        projectId: null,
        projectName: null,
        taskId: null,
        taskName: null,
        checkIn: r.checkIn,
        checkOut: r.checkOut,
        breakMin: r.breakMin,
        workingMin: r.workingMin,
      });
      continue;
    }
    for (const entry of dayEntries) {
      const task = entry.taskId ? tasksById.get(entry.taskId) : undefined;
      const project = task ? projectsById.get(task.projectId) : undefined;
      rows.push({
        id: entry.id,
        employeeId: r.employeeId,
        employeeName: r.name,
        department: r.department,
        date: r.date,
        projectId: project?.id ?? null,
        projectName: project?.name ?? null,
        taskId: task?.id ?? null,
        taskName: task?.title ?? null,
        checkIn: r.checkIn,
        checkOut: r.checkOut,
        breakMin: r.breakMin,
        workingMin: r.workingMin,
      });
    }
  }
  rows.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.employeeName.localeCompare(b.employeeName)));

  // Summary cards reflect the selected date range only (not whichever
  // project/task the table below is narrowed to), so they stay a stable
  // read on overall attendance while the table is explored further.
  const totalWorkingMin = working.reduce((sum, r) => sum + (r.workingMin ?? 0), 0);
  const totalBreakMin = working.reduce((sum, r) => sum + r.breakMin, 0);
  const employeesTracked = new Set(working.map((r) => r.employeeId)).size;
  const avgWorkingMin = employeesTracked > 0 ? Math.round(totalWorkingMin / employeesTracked) : 0;

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 4px" }}>Timesheet Overview</h1>
        <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: 0 }}>
          Generated from attendance and task records - no manual submission or approval step.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 18 }}>
        <StatTile label="Total Working Hours" value={fmtDuration(totalWorkingMin)} icon={Clock} tone="accent" />
        <StatTile label="Average Working Hours" value={fmtDuration(avgWorkingMin)} icon={BarChart3} tone="info" />
        <StatTile label="Total Break Hours" value={fmtDuration(totalBreakMin)} icon={Coffee} tone="warning" />
        <StatTile label="Employees Tracked" value={employeesTracked} icon={Users} tone="success" />
      </div>

      <TimesheetPeriodFilter period={period.mode} anchor={period.anchor} from={period.from} to={period.to} />

      <TimesheetOverviewTable rows={rows} />
    </>
  );
}
