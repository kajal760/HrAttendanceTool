import type {
  DepartmentOverviewRow,
  HrDashboardData,
  OrgChartData,
  OrgChartDepartment,
  RecentActivityEntry,
} from "@/types/hr";
import type { LifecycleEvent, LifecycleEventType } from "@/types/hr";
import type { ProjectRollupStatus, WorkTaskDisplayStatus } from "@/types/work";
import { getEmployeeOverviews } from "@/lib/hr/employee-store";
import { getProjects, getTasks } from "@/lib/hr/work-store";
import { displayStatus, projectStatus } from "@/lib/work/status";

function describeLifecycleEvent(employeeName: string, event: LifecycleEvent): string {
  const type = event.type as LifecycleEventType;
  switch (type) {
    case "Joined":
      return `${employeeName} joined the company`;
    case "Onboarding completed":
      return `${employeeName} completed onboarding`;
    case "Confirmed":
      return `${employeeName} was confirmed as a permanent employee`;
    case "Transferred":
      return `${employeeName} was transferred${event.detail ? ` — ${event.detail}` : ""}`;
    case "Promoted":
      return `${employeeName} was promoted${event.detail ? ` — ${event.detail}` : ""}`;
    case "Designation changed":
      return `${employeeName}'s designation changed${event.detail ? ` to ${event.detail}` : ""}`;
    case "Manager changed":
      return `${employeeName}'s reporting manager was changed`;
    case "Location changed":
      return `${employeeName}'s work location was changed`;
    case "Separation initiated":
      return `${employeeName}'s separation was initiated${event.detail ? ` — ${event.detail}` : ""}`;
    case "Exited":
      return `${employeeName} exited the company`;
    case "F&F settled":
      return `${employeeName}'s full & final settlement was recorded`;
    case "Deactivated":
      return `${employeeName}'s account was deactivated`;
    case "Reactivated":
      return `${employeeName}'s account was reactivated`;
    default:
      return `${employeeName}: ${type}`;
  }
}

// Merges real events from across the app - employee lifecycle history, and
// project/task activity from the Work & Project store - into one
// chronological feed. There's no dedicated "requests" store yet, so request
// submissions aren't represented here (rather than fabricate them).
async function getRecentActivity(limit: number): Promise<RecentActivityEntry[]> {
  const [employees, projects, tasks] = await Promise.all([
    getEmployeeOverviews(),
    getProjects(),
    getTasks(),
  ]);
  const projectsById = new Map(projects.map((p) => [p.id, p]));
  const employeesById = new Map(employees.map((e) => [e.id, e]));

  const entries: RecentActivityEntry[] = [];

  for (const emp of employees) {
    for (const event of emp.lifecycleHistory) {
      entries.push({ id: event.id, timestamp: event.date, description: describeLifecycleEvent(emp.name, event) });
    }
  }

  for (const project of projects) {
    entries.push({
      id: `${project.id}-created`,
      timestamp: project.createdOn,
      description: `${project.createdBy} created project "${project.name}"`,
    });
  }

  for (const task of tasks) {
    const projectName = projectsById.get(task.projectId)?.name ?? "an unlinked project";
    entries.push({
      id: `${task.id}-created`,
      timestamp: task.createdOn,
      description: `${task.createdBy} created task "${task.title}" in ${projectName}`,
    });
    if (task.summaryUpdatedAt) {
      const assignees = task.assigneeIds.map((id) => employeesById.get(id)?.name ?? id).join(", ");
      entries.push({
        id: `${task.id}-summary`,
        timestamp: task.summaryUpdatedAt,
        description: `${assignees} updated the summary for "${task.title}"`,
      });
    }
    if (task.status === "Completed") {
      entries.push({
        id: `${task.id}-completed`,
        timestamp: task.updatedAt,
        description: `"${task.title}" was marked Completed`,
      });
    }
  }

  return entries.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1)).slice(0, limit);
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((sum, v) => sum + v, 0) / values.length);
}

async function getDepartmentOverview(): Promise<DepartmentOverviewRow[]> {
  const employees = await getEmployeeOverviews();
  const byDepartment = new Map<string, typeof employees>();
  for (const emp of employees) {
    const list = byDepartment.get(emp.department) ?? [];
    list.push(emp);
    byDepartment.set(emp.department, list);
  }
  return Array.from(byDepartment.entries())
    .map(([name, members]) => ({
      name,
      employeeCount: members.length,
      attendancePct: average(members.map((m) => m.attendancePct)),
      performancePct: average(members.map((m) => m.performanceScore)),
    }))
    .sort((a, b) => b.employeeCount - a.employeeCount);
}

// TODO: replace with real aggregation queries once there's a backend for the
// pieces that still don't have one (presence/attendance logs, requests).
// Headcount, onboarding, project/task rollups, and department averages are
// already computed from the real employee/work stores.
export async function getHrDashboardData(): Promise<HrDashboardData> {
  const [employees, projects, tasks, departmentOverview, recentActivity] = await Promise.all([
    getEmployeeOverviews(),
    getProjects(),
    getTasks(),
    getDepartmentOverview(),
    getRecentActivity(6),
  ]);

  const headcount = employees.length;
  const presentToday = Math.round(headcount * 0.81);
  const onboardingCount = employees.filter((e) => e.status === "Onboarding").length;
  const pendingRequestCount = 7;

  const projectStatusCounts: Record<ProjectRollupStatus, number> = {
    Active: 0,
    Completed: 0,
    Upcoming: 0,
    Delayed: 0,
  };
  for (const project of projects) projectStatusCounts[projectStatus(project, tasks)] += 1;

  const taskStatusBreakdown: Record<WorkTaskDisplayStatus, number> = {
    Pending: 0,
    Ongoing: 0,
    Completed: 0,
    Overdue: 0,
  };
  for (const task of tasks) taskStatusBreakdown[displayStatus(task)] += 1;
  const taskCompletionPct = tasks.length === 0 ? 0 : Math.round((taskStatusBreakdown.Completed / tasks.length) * 100);

  return {
    summaryCards: [
      {
        id: "employees",
        label: "Total employees",
        value: headcount.toLocaleString(),
        meta: `${presentToday} present today`,
        icon: "employees",
      },
      {
        id: "attendance",
        label: "Attendance today",
        value: `${Math.round((presentToday / headcount) * 100)}%`,
        meta: `${presentToday} of ${headcount} clocked in`,
        icon: "attendance",
      },
      {
        id: "requests",
        label: "Pending requests",
        value: String(pendingRequestCount),
        meta: "Leave, WFH, corrections & more",
        icon: "requests",
      },
      {
        id: "projects",
        label: "Active projects",
        value: String(projectStatusCounts.Active),
        meta: `${projects.length} total`,
        icon: "projects",
      },
      {
        id: "tasks",
        label: "Task completion",
        value: `${taskCompletionPct}%`,
        meta: `${taskStatusBreakdown.Overdue} overdue`,
        icon: "tasks",
      },
      {
        id: "onboarding",
        label: "Onboarding",
        value: String(onboardingCount),
        meta: "employees currently onboarding",
        icon: "onboarding",
      },
    ],
    attendanceTrend: [
      { label: "Apr", value: 88 },
      { label: "May", value: 84 },
      { label: "Jun", value: 90 },
      { label: "Jul", value: 79 },
      { label: "Aug", value: 86 },
      { label: "Sep", value: 81 },
    ],
    attendanceBreakdown: [
      { label: "Present", value: Math.round(headcount * 0.69) },
      { label: "WFH", value: presentToday - Math.round(headcount * 0.69) },
      { label: "On Leave", value: Math.round(headcount * 0.12) },
      { label: "Late", value: Math.round(headcount * 0.05) },
      { label: "Absent", value: headcount - presentToday - Math.round(headcount * 0.12) - Math.round(headcount * 0.05) },
    ],
    requestsByType: [
      { label: "Leave", value: 18 },
      { label: "WFH", value: 11 },
      { label: "WFO", value: 6 },
      { label: "Query", value: 9 },
      { label: "Other", value: 3 },
    ],
    projectStatusCounts,
    taskStatusBreakdown,
    departmentOverview,
    recentActivity,
    pendingRequestCount,
  };
}

// The employee directory itself now lives in `employee-store.ts` (it needs
// to be writable - see "Add employee" - so a plain hardcoded array here no
// longer fits). Re-exported so existing pages don't need to change imports.
export { getEmployeeOverviews };

// TODO: replace the executive placeholder with the real leadership record
// once one exists; grouping stays the same (roll the employee directory up
// by department).
export async function getOrgChartData(): Promise<OrgChartData> {
  const employees = await getEmployeeOverviews();

  const byDepartment = new Map<string, OrgChartDepartment>();
  for (const emp of employees) {
    if (!byDepartment.has(emp.department)) {
      byDepartment.set(emp.department, { name: emp.department, employees: [] });
    }
    byDepartment.get(emp.department)!.employees.push({
      id: emp.id,
      name: emp.name,
      initials: emp.initials,
      designation: emp.designation,
    });
  }

  return {
    executive: { name: "Vikram Rao", initials: "VR", title: "Chief Financial Officer" },
    departments: Array.from(byDepartment.values()),
  };
}
