import type {
  AssetHistoryEntry,
  AssetItem,
  AssetRequest,
  AttendanceCalendarDay,
  AttendanceLogEntry,
  CompanyEvent,
  CompanyHoliday,
  CorrectionRequest,
  DailyHoursPoint,
  DirectoryPerson,
  EmployeeDashboardData,
  EmployeeProfile,
  RequestRecipient,
  SoftwareLicense,
  UpcomingBirthday,
} from "@/types/employee";
import type { WorkTaskDisplayStatus, WorkTaskWithProject } from "@/types/work";
import { getProjects, getTasksForEmployee } from "@/lib/hr/work-store";
import { displayStatus } from "@/lib/work/status";

// TODO: replace this whole module with real API calls once the backend is
// wired up (e.g. `fetch("/api/employee/dashboard")`, `fetch("/api/tasks")`).
// Kept as plain async functions so callers don't need to change shape later.

export const CURRENT_PROFILE: EmployeeProfile = {
  id: "emp-1024",
  name: "Aditi Sharma",
  initials: "AS",
  designation: "Software Engineer",
  department: "Engineering",
};

export async function getEmployeeDashboardData(
  profile: EmployeeProfile = CURRENT_PROFILE,
): Promise<EmployeeDashboardData> {
  const [myTasks, projects] = await Promise.all([
    getTasksForEmployee(profile.id),
    getProjects(),
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

  return {
    profile,
    today: {
      clockedIn: false,
    },
    // The BRD's six leave categories (Casual/Sick/Compensatory/Mandatory/
    // Birthday/Work Anniversary) - see LEAVE_CATEGORIES in types/employee.ts.
    leave: {
      totalAllocated: 29,
      totalUsed: 11,
      totalRemaining: 18,
      byType: [
        { type: "Casual Leave", allocated: 12, used: 5, remaining: 7 },
        { type: "Sick Leave", allocated: 8, used: 2, remaining: 6 },
        { type: "Compensatory Leave", allocated: 4, used: 1, remaining: 3 },
        { type: "Mandatory Leave", allocated: 3, used: 3, remaining: 0 },
        { type: "Birthday Leave", allocated: 1, used: 0, remaining: 1 },
        { type: "Work Anniversary Leave", allocated: 1, used: 0, remaining: 1 },
      ],
    },
    tasks: { counts, recentTasks },
    history: [
      {
        id: "hist-1",
        date: "2026-09-27",
        type: "attendance",
        description: "Clocked in from Office",
        meta: "09:04 AM",
      },
      {
        id: "hist-2",
        date: "2026-09-26",
        type: "task",
        description: "Updated \"Sprint 12 code review\" to Completed",
      },
      {
        id: "hist-3",
        date: "2026-09-25",
        type: "leave",
        description: "Applied for Casual Leave",
        meta: "1 day · Sep 30",
      },
      {
        id: "hist-4",
        date: "2026-09-24",
        type: "attendance",
        description: "Clocked in from Work From Home",
        meta: "09:12 AM",
      },
      {
        id: "hist-5",
        date: "2026-09-23",
        type: "policy",
        description: "Acknowledged updated Leave Policy v2.3",
      },
    ],
  };
}

export async function getAttendanceLog(): Promise<AttendanceLogEntry[]> {
  return [
    {
      id: "log-2026-09-26",
      date: "2026-09-26",
      clockIn: "2026-09-26T09:04:00.000Z",
      clockOut: "2026-09-26T18:12:00.000Z",
      workMode: "Office",
      breakMinutes: 45,
      netHours: 8.4,
      status: "Present",
    },
    {
      id: "log-2026-09-25",
      date: "2026-09-25",
      clockIn: "2026-09-25T09:12:00.000Z",
      clockOut: "2026-09-25T17:50:00.000Z",
      workMode: "Work From Home",
      breakMinutes: 30,
      netHours: 8.1,
      status: "Present",
    },
    {
      id: "log-2026-09-24",
      date: "2026-09-24",
      clockIn: "2026-09-24T09:30:00.000Z",
      clockOut: "2026-09-24T13:45:00.000Z",
      workMode: "Office",
      breakMinutes: 15,
      netHours: 4,
      status: "Half Day",
    },
    {
      id: "log-2026-09-23",
      workMode: "Office",
      date: "2026-09-23",
      breakMinutes: 0,
      netHours: 0,
      status: "On Leave",
    },
    {
      id: "log-2026-09-22",
      date: "2026-09-22",
      clockIn: "2026-09-22T09:01:00.000Z",
      clockOut: "2026-09-22T18:05:00.000Z",
      workMode: "Office",
      breakMinutes: 50,
      netHours: 8.2,
      status: "Present",
    },
  ];
}

// Two work-weeks of daily records for the Timesheets page - `getAttendanceLog`
// stays at 5 entries for the Attendance page's "Recent attendance" table.
export async function getTimesheetLog(): Promise<AttendanceLogEntry[]> {
  const recent = await getAttendanceLog();
  const earlier: AttendanceLogEntry[] = [
    {
      id: "log-2026-09-19",
      date: "2026-09-19",
      clockIn: "2026-09-19T09:08:00.000Z",
      clockOut: "2026-09-19T18:02:00.000Z",
      workMode: "Office",
      breakMinutes: 40,
      netHours: 8.2,
      status: "Present",
    },
    {
      id: "log-2026-09-18",
      date: "2026-09-18",
      workMode: "Office",
      breakMinutes: 0,
      netHours: 0,
      status: "On Leave",
    },
    {
      id: "log-2026-09-17",
      date: "2026-09-17",
      clockIn: "2026-09-17T09:02:00.000Z",
      clockOut: "2026-09-17T17:58:00.000Z",
      workMode: "Work From Home",
      breakMinutes: 35,
      netHours: 8.4,
      status: "Present",
    },
    {
      id: "log-2026-09-16",
      date: "2026-09-16",
      clockIn: "2026-09-16T09:00:00.000Z",
      clockOut: "2026-09-16T18:10:00.000Z",
      workMode: "Office",
      breakMinutes: 50,
      netHours: 8.3,
      status: "Present",
    },
    {
      id: "log-2026-09-15",
      date: "2026-09-15",
      clockIn: "2026-09-15T09:20:00.000Z",
      clockOut: "2026-09-15T18:00:00.000Z",
      workMode: "Office",
      breakMinutes: 45,
      netHours: 7.9,
      status: "Present",
    },
  ];
  return [...recent, ...earlier];
}

export async function getCorrectionRequests(): Promise<CorrectionRequest[]> {
  return [
    {
      id: "corr-1",
      date: "2026-09-21",
      requestedClockIn: "09:05",
      requestedClockOut: "18:00",
      reason:
        "Forgot to clock in - was on a client call from 8:45 AM, joined the office network late.",
      status: "Approved",
      submittedAt: "2026-09-21T19:30:00.000Z",
    },
    {
      id: "corr-2",
      date: "2026-09-19",
      requestedClockIn: "09:15",
      reason: "App didn't capture location on the office Wi-Fi; clocked in manually with the guard log as proof.",
      status: "Pending",
      submittedAt: "2026-09-19T20:10:00.000Z",
    },
  ];
}

// --- Holidays, events, and dashboard widgets --------------------------------

function addDays(base: Date, days: number): string {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString("en-CA");
}

// Offsets from today, same reasoning as `monthDayOffset` above - keeps the
// demo data looking "upcoming" no matter when this runs.
export async function getUpcomingHolidays(): Promise<CompanyHoliday[]> {
  const today = new Date();
  return [
    { id: "hol-1", name: "Diwali", date: addDays(today, 12), type: "Public" },
    { id: "hol-2", name: "Christmas", date: addDays(today, 79), type: "Public" },
    { id: "hol-3", name: "New Year's Day", date: addDays(today, 86), type: "Public" },
  ];
}

export async function getCompanyEvents(): Promise<CompanyEvent[]> {
  const today = new Date();
  return [
    { id: "evt-1", title: "All-Hands Townhall", date: addDays(today, 3), category: "Townhall" },
    {
      id: "evt-2",
      title: "Engineering Team Outing",
      date: addDays(today, 10),
      category: "Team Outing",
      location: "Lonavala",
    },
    { id: "evt-3", title: "Security Awareness Training", date: addDays(today, 18), category: "Training" },
  ];
}

const WEEKDAY_HOURS = [0, 8.2, 7.8, 8.5, 8.1, 7.6, 0]; // Sun..Sat

// Last 7 calendar days ending today, for the dashboard's "Monthly Stats"
// bar chart - deterministic by weekday so it doesn't flicker between
// requests, same convention as the rest of this module's date math.
export async function getRecentWorkHours(): Promise<DailyHoursPoint[]> {
  const today = new Date();
  const points: DailyHoursPoint[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    points.push({
      date: d.toLocaleDateString("en-CA"),
      label: d.toLocaleDateString(undefined, { weekday: "short" }),
      hours: WEEKDAY_HOURS[d.getDay()],
    });
  }
  return points;
}

// Current month's day-by-day status for the dashboard's attendance
// calendar widget. Weekends and holidays are derived; a couple of fixed
// offsets are marked On Leave / Half Day so the calendar isn't a wall of
// identical "Present" dots, matching what the attendance log already shows
// for the same stretch of days.
export async function getAttendanceCalendar(
  year?: number,
  month?: number, // 0-indexed, same as Date#getMonth
): Promise<AttendanceCalendarDay[]> {
  const today = new Date();
  const holidays = await getUpcomingHolidays();
  const holidayByDate = new Map(holidays.map((h) => [h.date, h.name]));
  const todayKey = today.toLocaleDateString("en-CA");
  const onLeaveKey = addDays(today, -16); // matches log-2026-09-23 "On Leave" when today is early Oct
  const halfDayKey = addDays(today, -13); // matches log-2026-09-24 "Half Day"

  const resolvedYear = year ?? today.getFullYear();
  const resolvedMonth = month ?? today.getMonth();
  const daysInMonth = new Date(resolvedYear, resolvedMonth + 1, 0).getDate();

  const days: AttendanceCalendarDay[] = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(resolvedYear, resolvedMonth, day);
    const key = d.toLocaleDateString("en-CA");
    const isWeekend = d.getDay() === 0 || d.getDay() === 6;

    if (holidayByDate.has(key)) {
      days.push({ date: key, status: "Holiday", label: holidayByDate.get(key) });
    } else if (key > todayKey) {
      days.push({ date: key, status: "Upcoming" });
    } else if (isWeekend) {
      days.push({ date: key, status: "Weekend" });
    } else if (key === onLeaveKey) {
      days.push({ date: key, status: "On Leave" });
    } else if (key === halfDayKey) {
      days.push({ date: key, status: "Half Day" });
    } else {
      days.push({ date: key, status: "Present" });
    }
  }
  return days;
}

// --- Asset management ------------------------------------------------------

export async function getMyAssets(): Promise<AssetItem[]> {
  return [
    {
      id: "asset-1",
      type: "Laptop",
      name: 'MacBook Pro 14" M3',
      assetTag: "LAP-2291",
      status: "Allocated",
      allocatedOn: "2025-03-10",
      condition: "Good",
    },
    {
      id: "asset-2",
      type: "Phone",
      name: "iPhone 13",
      assetTag: "PHN-0456",
      status: "Allocated",
      allocatedOn: "2025-03-10",
      condition: "Good",
    },
    {
      id: "asset-3",
      type: "ID Card",
      name: "Employee ID Card",
      assetTag: "ID-1024",
      status: "Allocated",
      allocatedOn: "2025-01-05",
      condition: "New",
    },
    {
      id: "asset-4",
      type: "Access Card",
      name: "Building Access Card",
      assetTag: "ACC-1024",
      status: "Allocated",
      allocatedOn: "2025-01-05",
      condition: "Good",
    },
    {
      id: "asset-5",
      type: "Monitor",
      name: 'Dell 27" Monitor',
      assetTag: "MON-0987",
      status: "Allocated",
      allocatedOn: "2025-06-01",
      condition: "Fair",
    },
    {
      id: "asset-6",
      type: "Laptop",
      name: "Dell XPS 13",
      assetTag: "LAP-1187",
      status: "Returned",
      allocatedOn: "2024-01-15",
      returnedOn: "2025-03-09",
      condition: "Good",
    },
  ];
}

export async function getSoftwareLicenses(): Promise<SoftwareLicense[]> {
  return [
    {
      id: "lic-1",
      name: "Microsoft 365 E3",
      seat: "E3",
      assignedOn: "2025-01-05",
      expiresOn: "2026-12-31",
      status: "Active",
    },
    {
      id: "lic-2",
      name: "JetBrains All Products Pack",
      seat: "Individual",
      assignedOn: "2025-02-01",
      expiresOn: "2026-10-15",
      status: "Expiring Soon",
    },
    {
      id: "lic-3",
      name: "Slack",
      seat: "Standard",
      assignedOn: "2025-01-05",
      status: "Active",
    },
    {
      id: "lic-4",
      name: "Figma",
      seat: "Viewer",
      assignedOn: "2025-04-10",
      expiresOn: "2026-08-01",
      status: "Expired",
    },
  ];
}

export async function getAssetHistory(): Promise<AssetHistoryEntry[]> {
  return [
    {
      id: "ahist-1",
      date: "2024-01-15",
      assetName: "Dell XPS 13",
      action: "Allocated",
    },
    {
      id: "ahist-2",
      date: "2025-01-05",
      assetName: "Employee ID Card",
      action: "Allocated",
    },
    {
      id: "ahist-3",
      date: "2025-01-05",
      assetName: "Building Access Card",
      action: "Allocated",
    },
    {
      id: "ahist-4",
      date: "2025-03-09",
      assetName: "Dell XPS 13",
      action: "Returned",
      note: "Upgraded to new laptop",
    },
    {
      id: "ahist-5",
      date: "2025-03-10",
      assetName: 'MacBook Pro 14" M3',
      action: "Allocated",
    },
    {
      id: "ahist-6",
      date: "2025-03-10",
      assetName: "iPhone 13",
      action: "Allocated",
    },
    {
      id: "ahist-7",
      date: "2025-06-01",
      assetName: 'Dell 27" Monitor',
      action: "Allocated",
    },
    {
      id: "ahist-8",
      date: "2026-08-20",
      assetName: 'Dell 27" Monitor',
      action: "Reported Damaged",
      note: "Screen flickers intermittently",
    },
    {
      id: "ahist-9",
      date: "2026-08-28",
      assetName: 'Dell 27" Monitor',
      action: "Repaired",
      note: "Panel cable reseated by IT",
    },
  ];
}

export async function getAssetRequests(): Promise<AssetRequest[]> {
  return [
    {
      id: "areq-1",
      assetId: "asset-5",
      assetName: 'Dell 27" Monitor',
      type: "Report Damaged",
      note: "Screen flickers when the laptop is undocked and redocked.",
      status: "Pending",
      submittedAt: "2026-09-20T11:00:00.000Z",
    },
  ];
}

// --- Company directory & birthdays -----------------------------------------

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

// Offsets a MM-DD from today so the demo data always has a "birthday today"
// and a spread of upcoming ones, regardless of when this runs.
function monthDayOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function buildDirectory(): DirectoryPerson[] {
  return [
    {
      id: "emp-1024",
      name: "Aditi Sharma",
      initials: "AS",
      email: "aditi.sharma@hrattendance.example",
      department: "Engineering",
      birthdateMonthDay: monthDayOffset(146),
    },
    {
      id: "emp-1032",
      name: "Rohit Verma",
      initials: "RV",
      email: "rohit.verma@hrattendance.example",
      department: "Engineering",
      birthdateMonthDay: monthDayOffset(0), // demo: today
    },
    {
      id: "emp-1045",
      name: "Neha Kapoor",
      initials: "NK",
      email: "neha.kapoor@hrattendance.example",
      department: "Human Resources",
      birthdateMonthDay: monthDayOffset(6),
    },
    {
      id: "emp-1051",
      name: "Sameer Iyer",
      initials: "SI",
      email: "sameer.iyer@hrattendance.example",
      department: "Product",
      birthdateMonthDay: monthDayOffset(19),
    },
    {
      id: "emp-1067",
      name: "Priya Nair",
      initials: "PN",
      email: "priya.nair@hrattendance.example",
      department: "Design",
      birthdateMonthDay: monthDayOffset(58),
    },
  ];
}

export async function getCompanyDirectory(): Promise<DirectoryPerson[]> {
  return buildDirectory();
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
  return buildDirectory()
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

// Fixed role inboxes, ahead of colleagues in the @mention list.
const ROLE_RECIPIENTS: RequestRecipient[] = [
  { id: "role-hr", label: "HR", email: "hr@hrattendance.example" },
  { id: "role-cfo", label: "CFO", email: "cfo@hrattendance.example" },
];

export async function getRequestRecipients(): Promise<RequestRecipient[]> {
  const colleagues = buildDirectory()
    .filter((person) => person.id !== CURRENT_PROFILE.id)
    .map((person) => ({ id: person.id, label: person.name, email: person.email }));
  return [...ROLE_RECIPIENTS, ...colleagues];
}
