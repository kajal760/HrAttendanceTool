import type {
  CategoryCount,
  DepartmentOverviewRow,
  HrDashboardData,
  OrgChartData,
  OrgChartDepartment,
  RecentActivityEntry,
  TrendPoint,
} from "@/types/hr";
import type { LifecycleEvent, LifecycleEventType } from "@/types/hr";
import type { ProjectRollupStatus, WorkTaskDisplayStatus } from "@/types/work";
import { getEmployeeOverviews } from "@/lib/hr/employee-store";
import { getProjects, getTasks } from "@/lib/hr/work-store";
import { displayStatus, projectStatus } from "@/lib/work/status";
import { getDailyRecords, getRangeRecords, resolvePeriod, todayIso } from "@/lib/hr/attendance-daily";
import { getLeaveRequests } from "@/lib/hr/leave-store";
import { getCorrections } from "@/lib/hr/attendance-corrections";

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

const MONTH_LABEL = new Intl.DateTimeFormat(undefined, { month: "short" });

// % of expected working-day records that were actually attended (Present,
// Late or Half Day), one point per calendar month, from the real roster -
// the same `/attendance/range` data the Attendance module itself uses.
async function getAttendanceTrend(): Promise<TrendPoint[]> {
  const period = resolvePeriod({ period: "six" });
  const records = await getRangeRecords(period.from, period.to);

  const byMonth = new Map<string, { attended: number; total: number }>();
  for (const r of records) {
    if (r.status === "Holiday") continue; // not an expected working day
    const monthKey = r.date.slice(0, 7); // YYYY-MM
    const bucket = byMonth.get(monthKey) ?? { attended: 0, total: 0 };
    bucket.total += 1;
    if (r.status === "Present" || r.status === "Late" || r.status === "Half Day") bucket.attended += 1;
    byMonth.set(monthKey, bucket);
  }

  return Array.from(byMonth.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([key, { attended, total }]) => ({
      label: MONTH_LABEL.format(new Date(`${key}-01T00:00:00`)),
      value: total === 0 ? 0 : Math.round((attended / total) * 100),
    }));
}

interface AttendanceToday {
  presentToday: number;
  totalToday: number;
  breakdown: CategoryCount[];
}

// Today's roster, bucketed the same way the Attendance overview page counts
// it. [] on a weekend, so these all come back zero rather than fabricated.
async function getAttendanceToday(): Promise<AttendanceToday> {
  const records = await getDailyRecords(todayIso());
  const presentToday = records.filter(
    (r) => r.status === "Present" || r.status === "Late" || r.status === "Half Day",
  ).length;

  return {
    presentToday,
    totalToday: records.length,
    breakdown: [
      { label: "Present", value: records.filter((r) => r.status === "Present").length },
      {
        label: "WFH",
        value: records.filter((r) => r.workMode === "WFH" && r.status !== "Absent" && r.status !== "On Leave").length,
      },
      { label: "On Leave", value: records.filter((r) => r.status === "On Leave").length },
      { label: "Late", value: records.filter((r) => r.status === "Late").length },
      { label: "Absent", value: records.filter((r) => r.status === "Absent").length },
    ],
  };
}

interface PendingRequests {
  pendingRequestCount: number;
  requestsByType: CategoryCount[];
}

// Leave and attendance corrections are the only "request" concepts the
// backend actually has - there's no WFH/WFO/Query workflow to report on.
async function getPendingRequests(): Promise<PendingRequests> {
  const [leave, corrections] = await Promise.all([getLeaveRequests(), getCorrections()]);
  const pendingLeave = leave.filter((r) => r.status === "Pending").length;
  const pendingCorrections = corrections.filter((c) => c.status === "Pending").length;
  return {
    pendingRequestCount: pendingLeave + pendingCorrections,
    requestsByType: [
      { label: "Leave", value: pendingLeave },
      { label: "Correction", value: pendingCorrections },
    ],
  };
}

export async function getHrDashboardData(): Promise<HrDashboardData> {
  const [employees, projects, tasks, departmentOverview, recentActivity, attendanceTrend, today, requests] =
    await Promise.all([
      getEmployeeOverviews(),
      getProjects(),
      getTasks(),
      getDepartmentOverview(),
      getRecentActivity(6),
      getAttendanceTrend(),
      getAttendanceToday(),
      getPendingRequests(),
    ]);

  const headcount = employees.length;
  const onboardingCount = employees.filter((e) => e.status === "Onboarding").length;

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
        meta: `${today.presentToday} present today`,
        icon: "employees",
      },
      {
        id: "attendance",
        label: "Attendance today",
        value: today.totalToday === 0 ? "—" : `${Math.round((today.presentToday / today.totalToday) * 100)}%`,
        meta:
          today.totalToday === 0
            ? "No attendance recorded on weekends"
            : `${today.presentToday} of ${today.totalToday} clocked in`,
        icon: "attendance",
      },
      {
        id: "requests",
        label: "Pending requests",
        value: String(requests.pendingRequestCount),
        meta: "Leave & attendance corrections",
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
    attendanceTrend,
    attendanceBreakdown: today.breakdown,
    requestsByType: requests.requestsByType,
    projectStatusCounts,
    taskStatusBreakdown,
    departmentOverview,
    recentActivity,
    pendingRequestCount: requests.pendingRequestCount,
  };
}

// TODO: replace the placeholder executive once a real leadership record
// exists on the backend; grouping stays the same (roll the employee
// directory up by department). Until then the chart renders without a root
// node rather than showing a made-up name/title.
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
    departments: Array.from(byDepartment.values()),
  };
}
