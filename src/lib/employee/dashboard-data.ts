import type {
  AssetHistoryEntry,
  AssetItem,
  AssetRequest,
  AttendanceCalendarDay,
  AttendanceLogEntry,
  CompanyEvent,
  CompanyHoliday,
  DailyHoursPoint,
  DirectoryPerson,
  EmployeeDashboardData,
  EmployeeProfile,
  HistoryEntry,
  RequestRecipient,
  SoftwareLicense,
  UpcomingBirthday,
} from "@/types/employee";
import type { AssetCategory } from "@/types/asset";
import type { WorkTask, WorkTaskDisplayStatus, WorkTaskWithProject } from "@/types/work";
import { getProjects, getTasksForEmployee } from "@/lib/hr/work-store";
import { displayStatus } from "@/lib/work/status";
import { getCompanyHolidays } from "@/lib/hr/holidays";
import { fetchAttendanceHistory } from "@/lib/hr/attendance-history";
import { getTodayRecord } from "@/lib/hr/attendance-store";
import { getLeaveRequestsForEmployee, getLeaveSummary } from "@/lib/hr/leave-store";
import { getCorrectionsForEmployee } from "@/lib/hr/attendance-corrections";
import { getEmployeeOverviews } from "@/lib/hr/employee-store";
import { getAssets } from "@/lib/hr/asset-store";
import type { ApiAttendanceDay } from "@/lib/api/types";

// --- Employee dashboard ("My Feed") -----------------------------------------

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toLocaleDateString("en-CA");
}

// This employee's own recent activity, merged from the real leave,
// attendance-correction, attendance, and task-update records - the same
// domains `hr/dashboard-data.ts`'s company-wide feed draws from, just
// scoped to one person. No "policy acknowledged" entries - there's no
// policy-acknowledgement backend yet, so that history type never fires.
async function getHistory(employeeId: string, myTasks: WorkTask[], limit: number): Promise<HistoryEntry[]> {
  const [leaveRequests, corrections, recentDays] = await Promise.all([
    getLeaveRequestsForEmployee(employeeId),
    getCorrectionsForEmployee(employeeId),
    recentLog(employeeId, 5),
  ]);

  const entries: HistoryEntry[] = [];

  for (const r of leaveRequests) {
    entries.push({
      id: `leave-${r.id}-applied`,
      date: r.submittedAt,
      type: "leave",
      description: `Applied for ${r.category}`,
      meta: `${r.days} ${r.days === 1 ? "day" : "days"} · ${r.startDate}`,
    });
    if (r.status !== "Pending" && r.decidedAt) {
      entries.push({
        id: `leave-${r.id}-decided`,
        date: r.decidedAt,
        type: "leave",
        description: `${r.category} leave request ${r.status.toLowerCase()}`,
      });
    }
  }

  for (const c of corrections) {
    entries.push({
      id: `correction-${c.id}-submitted`,
      date: c.submittedOn,
      type: "attendance",
      description: `Requested an attendance correction for ${c.date}`,
    });
    if (c.status !== "Pending" && c.decidedOn) {
      entries.push({
        id: `correction-${c.id}-decided`,
        date: c.decidedOn,
        type: "attendance",
        description: `Attendance correction for ${c.date} ${c.status.toLowerCase()}`,
      });
    }
  }

  for (const day of recentDays) {
    if (day.status !== "Present") continue;
    entries.push({
      id: `attendance-${day.id}`,
      date: day.date,
      type: "attendance",
      description: `Clocked in from ${day.workMode}`,
      meta: day.clockIn ? new Date(day.clockIn).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }) : undefined,
    });
  }

  for (const task of myTasks) {
    if (displayStatus(task) !== "Completed") continue;
    entries.push({
      id: `task-${task.id}`,
      date: task.updatedAt,
      type: "task",
      description: `Updated "${task.title}" to Completed`,
    });
  }

  return entries.sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, limit);
}

export async function getEmployeeDashboardData(profile: EmployeeProfile): Promise<EmployeeDashboardData> {
  const [myTasks, projects, todayRecord, leave] = await Promise.all([
    getTasksForEmployee(profile.id),
    // `getProjects()` hits the Admin/HR-only `/work/projects` endpoint - an
    // Employee-role session gets a 401 there by design, so project names
    // just fall back to "Unknown project" below instead of crashing.
    getProjects().catch(() => []),
    getTodayRecord(),
    getLeaveSummary(profile.id),
  ]);
  const projectsById = new Map(projects.map((p) => [p.id, p]));

  const counts: Record<WorkTaskDisplayStatus, number> = {
    Pending: 0,
    Ongoing: 0,
    Completed: 0,
    Overdue: 0,
  };
  for (const task of myTasks) counts[displayStatus(task)] += 1;

  const recentTasks: WorkTaskWithProject[] = [...myTasks]
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
    .slice(0, 4)
    .map((task) => ({
      ...task,
      projectName: projectsById.get(task.projectId)?.name ?? "Unknown project",
    }));

  const history = await getHistory(profile.id, myTasks, 10);

  return {
    profile,
    today: {
      clockedIn: Boolean(todayRecord?.clockIn && !todayRecord.clockOut),
      clockInTime: todayRecord?.clockIn,
      workMode: todayRecord?.workMode,
    },
    leave,
    tasks: { counts, recentTasks },
    history,
  };
}

// Recent days from the backend's per-day attendance history - real
// clock-in/out records, approved leave, and days with neither (Absent).
// Weekends, holidays and days still to come are left out.
function toLogEntry(d: ApiAttendanceDay): AttendanceLogEntry | null {
  if (d.status === null || d.status === "Weekend" || d.status === "Holiday") return null;
  const r = d.record;
  return {
    id: r?.id ?? `day-${d.date}`,
    date: d.date,
    clockIn: r?.clockIn,
    clockOut: r?.clockOut ?? undefined,
    workMode: r?.workMode ?? "Office",
    breakMinutes: r?.breakMinutes ?? 0,
    netHours: r?.netHours ?? 0,
    // The log's vocabulary has no "Late" - a late day still counts as Present.
    status: d.status === "Late" ? "Present" : d.status,
  };
}

async function recentLog(employeeId: string, limit: number): Promise<AttendanceLogEntry[]> {
  const history = await fetchAttendanceHistory(employeeId, daysAgo(limit * 2 + 7), daysAgo(0));
  return history.days
    .map(toLogEntry)
    .filter((e): e is AttendanceLogEntry => e !== null)
    .slice(0, limit);
}

// The Attendance page's "Recent attendance" table.
export async function getAttendanceLog(employeeId: string): Promise<AttendanceLogEntry[]> {
  return recentLog(employeeId, 5);
}

// Two work-weeks of daily records for the Timesheets page.
export async function getTimesheetLog(employeeId: string): Promise<AttendanceLogEntry[]> {
  return recentLog(employeeId, 10);
}

// --- Holidays, events, and dashboard widgets --------------------------------

// Real, shared holiday list (`lib/hr/holidays.ts`) filtered to today and
// later - fixed calendar dates, so unlike a today-relative fixture this
// naturally empties out instead of silently drifting once the dates are in
// the past.
export async function getUpcomingHolidays(): Promise<CompanyHoliday[]> {
  const todayKey = new Date().toLocaleDateString("en-CA");
  return (await getCompanyHolidays())
    .filter((h) => h.date >= todayKey)
    .sort((a, b) => (a.date < b.date ? -1 : 1));
}

// No events/calendar endpoint on the backend yet.
export async function getCompanyEvents(): Promise<CompanyEvent[]> {
  return [];
}

// Last 7 calendar days ending today, for the dashboard's "Monthly Stats"
// bar chart - net hours worked from the real clock-in records.
export async function getRecentWorkHours(employeeId: string): Promise<DailyHoursPoint[]> {
  const history = await fetchAttendanceHistory(employeeId, daysAgo(6), daysAgo(0));
  const hoursByDate = new Map(history.days.map((d) => [d.date, d.record?.netHours ?? 0]));
  const points: DailyHoursPoint[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const date = d.toLocaleDateString("en-CA");
    points.push({
      date,
      label: d.toLocaleDateString(undefined, { weekday: "short" }),
      hours: hoursByDate.get(date) ?? 0,
    });
  }
  return points;
}

// Current month's day-by-day status for the dashboard's attendance
// calendar widget, from the backend's per-day history (real clock-ins,
// approved leave, the employee's holidays, weekends).
export async function getAttendanceCalendar(
  employeeId: string,
  year?: number,
  month?: number, // 0-indexed, same as Date#getMonth
): Promise<AttendanceCalendarDay[]> {
  const today = new Date();
  const resolvedYear = year ?? today.getFullYear();
  const resolvedMonth = month ?? today.getMonth();
  const first = new Date(resolvedYear, resolvedMonth, 1).toLocaleDateString("en-CA");
  const last = new Date(resolvedYear, resolvedMonth + 1, 0).toLocaleDateString("en-CA");
  const history = await fetchAttendanceHistory(employeeId, first, last);

  return [...history.days]
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .map((d): AttendanceCalendarDay => {
      switch (d.status) {
        case null:
          return { date: d.date, status: "Upcoming" };
        case "Late":
          return { date: d.date, status: "Present", label: "Late" };
        case "Holiday":
        case "On Leave":
          return { date: d.date, status: d.status, label: d.label ?? undefined };
        default:
          return { date: d.date, status: d.status };
      }
    });
}

// --- Asset management --------------------------------------------------------
// Backed by the same `/assets` endpoints the Admin/HR asset registry uses
// (`hr/asset-store.ts`) - an employee can read the full asset list, just
// not `/assets/events` (staff-only), so "mine" is filtered client-side by
// `ownerId`. Scoped to what's currently assigned to them: reconstructing
// assets they used to hold but no longer do isn't reliable from this feed
// (repair/retire events clear `ownerId` regardless of whose asset it was).

function toAssetType(category: AssetCategory): AssetItem["type"] | null {
  switch (category) {
    case "Laptop":
      return "Laptop";
    case "Phone":
      return "Phone";
    case "ID card":
      return "ID Card";
    case "Access card":
      return "Access Card";
    case "Monitor":
      return "Monitor";
    case "Desktop":
    case "Keyboard":
    case "Trackpad":
    case "Other":
      return "Other";
    case "Software licence":
      // Shown in "Software licenses", not the physical asset table.
      return null;
  }
}

export async function getMyAssets(employeeId: string): Promise<AssetItem[]> {
  const assets = await getAssets();
  const mine = assets.filter((a) => a.ownerId === employeeId);
  return mine
    .map((a): AssetItem | null => {
      const type = toAssetType(a.category);
      if (!type) return null;
      const assigned = [...a.history].reverse().find((e) => e.type === "Assigned");
      return {
        id: a.id,
        type,
        name: a.name,
        assetTag: a.assetTag,
        status: a.status === "Under repair" ? "Damaged" : "Allocated",
        allocatedOn: (a.assignedOn ?? assigned?.date ?? a.purchasedOn ?? "").slice(0, 10),
        condition: a.status === "Under repair" ? "Needs Repair" : undefined,
      };
    })
    .filter((a): a is AssetItem => a !== null);
}

// No seat/expiry tracking on the backend - "Software licence" category
// assets exist, but without the fields this table needs (plan, expiry).
export async function getSoftwareLicenses(): Promise<SoftwareLicense[]> {
  return [];
}

const ASSET_HISTORY_ACTION: Partial<Record<string, AssetHistoryEntry["action"]>> = {
  Assigned: "Allocated",
  Returned: "Returned",
  Repaired: "Repaired",
  "Sent for repair": "Reported Damaged",
};

export async function getAssetHistory(employeeId: string): Promise<AssetHistoryEntry[]> {
  const assets = await getAssets();
  const mine = assets.filter((a) => a.ownerId === employeeId);
  return mine
    .flatMap((a) =>
      a.history
        .filter((e) => ASSET_HISTORY_ACTION[e.type])
        .map((e): AssetHistoryEntry => ({
          id: e.id,
          date: e.date.slice(0, 10),
          assetName: a.name,
          action: ASSET_HISTORY_ACTION[e.type]!,
          note: e.detail ?? undefined,
        })),
    )
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

// No employee-initiated asset-request workflow on the backend yet (new
// asset / report lost / report damaged / return / replacement) - HR-side
// actions exist (`transitionAsset`), but nothing an employee can submit and
// track as "Pending" themselves.
export async function getAssetRequests(): Promise<AssetRequest[]> {
  return [];
}

// --- Company directory & birthdays ------------------------------------------
// Both backed by `/employees/directory` via `employee-store.ts` - the
// backend only strips private contact fields from colleague records
// (phone, personal email, addresses, emergency contact); work email and
// date of birth are still visible, which is all this needs.

function toDirectoryPerson(e: { id: string; name: string; initials: string; email: string; department: string; dateOfBirth?: string }): DirectoryPerson | null {
  if (!e.dateOfBirth) return null; // no DOB on file - can't place them on the birthday calendar
  return {
    id: e.id,
    name: e.name,
    initials: e.initials,
    email: e.email,
    department: e.department,
    birthdateMonthDay: e.dateOfBirth.slice(5), // "YYYY-MM-DD" -> "MM-DD"
  };
}

export async function getCompanyDirectory(): Promise<DirectoryPerson[]> {
  // `getEmployeeOverviews()` hits the Admin/HR-only `/employees/directory`
  // endpoint. This function is called from both portals (the Employee
  // birthday widget and the Admin/HR dashboard's own), so rather than guard
  // every caller separately, degrade here: an Employee-role session gets a
  // 401 there by design and should just see an empty birthday list, not a
  // crashed page; a real Admin/HR failure is low-stakes enough (birthdays
  // are decorative, not data anyone depends on) to degrade the same way.
  const employees = await getEmployeeOverviews().catch(() => []);
  return employees.map(toDirectoryPerson).filter((p): p is DirectoryPerson => p !== null);
}

function nextOccurrence(monthDay: string, today: Date): { daysUntil: number; isToday: boolean } {
  const [month, day] = monthDay.split("-").map(Number);
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  let candidate = new Date(todayMidnight.getFullYear(), month - 1, day);
  if (candidate < todayMidnight) {
    candidate = new Date(todayMidnight.getFullYear() + 1, month - 1, day);
  }
  const daysUntil = Math.round(
    (candidate.getTime() - todayMidnight.getTime()) / (24 * 60 * 60 * 1000),
  );
  return { daysUntil, isToday: daysUntil === 0 };
}

export async function getUpcomingBirthdays(
  limit = 5,
  windowDays = 60,
): Promise<UpcomingBirthday[]> {
  const today = new Date();
  const directory = await getCompanyDirectory();
  return directory
    .map((person) => ({ ...person, ...nextOccurrence(person.birthdateMonthDay, today) }))
    .filter((person) => person.daysUntil <= windowDays)
    .sort((a, b) => a.daysUntil - b.daysUntil)
    .slice(0, limit);
}

export async function getTodaysBirthdays(): Promise<DirectoryPerson[]> {
  const birthdays = await getUpcomingBirthdays(50, 0);
  return birthdays.filter((b) => b.isToday);
}

// --- Contact HR / requests --------------------------------------------------

// Fixed role inboxes, ahead of colleagues in the @mention list - there's no
// backend concept of a role inbox address, so these stay as configured
// constants rather than entity data.
const ROLE_RECIPIENTS: RequestRecipient[] = [
  { id: "role-hr", label: "HR", email: "hr@hrattendance.example" },
  { id: "role-cfo", label: "CFO", email: "cfo@hrattendance.example" },
];

// Colleagues come from the real directory (not filtered by DOB like the
// birthday list above - everyone's a valid recipient regardless of whether
// their date of birth is on file).
export async function getRequestRecipients(currentEmployeeId: string): Promise<RequestRecipient[]> {
  // Same Admin/HR-only `/employees/directory` restriction as above - an
  // Employee-role session just sees the fixed role inboxes, not a crash.
  const employees = await getEmployeeOverviews().catch(() => []);
  const colleagues = employees
    .filter((e) => e.id !== currentEmployeeId)
    .map((e) => ({ id: e.id, label: e.name, email: e.email }));
  return [...ROLE_RECIPIENTS, ...colleagues];
}
