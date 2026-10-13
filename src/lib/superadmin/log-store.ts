import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { LogActor, LogEventType, LogModule, LogSeverity, SystemLogEntry } from "@/types/log";
import type { LifecycleEvent, LifecycleEventType } from "@/types/hr";
import type { AnnouncementHistoryEventType } from "@/types/announcement";
import { getEmployeeOverviews } from "@/lib/hr/employee-store";
import { getProjects, getTasks } from "@/lib/hr/work-store";
import { getAnnouncements } from "@/lib/hr/announcement-store";

// Export events are genuinely real (recorded when a CSV export actually
// happens), so - unlike the synthetic auth ticker below - they're
// file-backed like `employee-store.ts`/`work-store.ts`: Next's dev server
// (Turbopack) runs route handlers and page components in separate module
// instances, so a plain in-memory array written by the export route would be
// invisible to the Log page's server component reading it moments later.
const DATA_DIR = path.join(process.cwd(), ".data");
const EXPORT_LOGS_PATH = path.join(DATA_DIR, "export-logs.json");

async function readExportLogs(): Promise<SystemLogEntry[]> {
  try {
    return JSON.parse(await readFile(EXPORT_LOGS_PATH, "utf8")) as SystemLogEntry[];
  } catch {
    return [];
  }
}

async function writeExportLogs(entries: SystemLogEntry[]): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(EXPORT_LOGS_PATH, JSON.stringify(entries, null, 2), "utf8");
}

// TODO: replace with a real log/audit pipeline (e.g. shipped from the API
// layer into something like CloudWatch/Elasticsearch and queried here).
// Authentication events are synthetic (seeded once, plus one new random
// event every ~90s of polling) since there's no real auth system yet.
// Attendance, Requests, and Access & Permissions events are a small static
// seed set for the same reason - none of those have a backing store either.
// Employees and Work & Projects events are real, computed fresh from
// `employee-store.ts` / `work-store.ts` on every call. Export events are
// real too, recorded by `recordExportEvent` when a CSV export happens.
// In-memory state does not survive a serverless cold start or a server
// restart - fine for `next dev`/a single `next start` process, not for a
// multi-instance deployment.

const SUPER_ADMIN: LogActor = { id: "super-admin", name: "Super Admin", initials: "SA" };

const ACTORS: LogActor[] = [
  { id: "emp-1024", name: "Aditi Sharma", initials: "AS" },
  { id: "emp-1032", name: "Rohit Verma", initials: "RV" },
  { id: "emp-1045", name: "Neha Kapoor", initials: "NK" },
  { id: "emp-1051", name: "Sameer Iyer", initials: "SI" },
  { id: "emp-1067", name: "Priya Nair", initials: "PN" },
];

const EVENT_INFO: Partial<Record<LogEventType, { module: LogModule; severity: LogSeverity }>> = {
  "Login successful": { module: "Authentication", severity: "info" },
  "Login failed": { module: "Authentication", severity: "warning" },
  Logout: { module: "Authentication", severity: "info" },
  "Password changed": { module: "Authentication", severity: "info" },
  "Password reset requested": { module: "Authentication", severity: "warning" },
  "Account locked": { module: "Authentication", severity: "critical" },
  "Account unlocked": { module: "Authentication", severity: "info" },
  "Session expired": { module: "Authentication", severity: "warning" },
  "MFA enabled": { module: "Authentication", severity: "info" },
  "MFA disabled": { module: "Authentication", severity: "warning" },
  "Profile details changed": { module: "Account", severity: "info" },
  "Data exported": { module: "Export", severity: "info" },
};

const DEVICES = [
  "Chrome on Windows · 103.21.4.10",
  "Safari on macOS · 172.16.4.22",
  "Chrome on Android · 49.207.11.5",
  "Edge on Windows · 106.51.90.14",
];

function actorFor(id: string): LogActor {
  return ACTORS.find((a) => a.id === id) ?? ACTORS[0];
}

function randomActor(): LogActor {
  return ACTORS[Math.floor(Math.random() * ACTORS.length)];
}

function randomDevice(): string {
  return DEVICES[Math.floor(Math.random() * DEVICES.length)];
}

function minutesAgo(mins: number): string {
  return new Date(Date.now() - mins * 60_000).toISOString();
}

function makeEntry(
  id: string,
  timestamp: string,
  event: LogEventType,
  actor: LogActor,
  detail?: string,
): SystemLogEntry {
  const info = EVENT_INFO[event];
  if (!info) throw new Error(`No module/severity mapping for log event "${event}".`);
  return { id, timestamp, module: info.module, event, actor, detail, severity: info.severity };
}

function buildSeedAuthLogs(): SystemLogEntry[] {
  const aditi = actorFor("emp-1024");
  const rohit = actorFor("emp-1032");
  const neha = actorFor("emp-1045");
  const sameer = actorFor("emp-1051");
  const priya = actorFor("emp-1067");

  return [
    makeEntry("log-seed-1", minutesAgo(4), "Login successful", aditi, DEVICES[0]),
    makeEntry("log-seed-2", minutesAgo(22), "Profile details changed", rohit, "Updated phone number"),
    makeEntry("log-seed-3", minutesAgo(48), "Session expired", neha, "Idle for 30 minutes"),
    makeEntry("log-seed-4", minutesAgo(55), "Login failed", sameer, "Incorrect password · attempt 1 of 5"),
    makeEntry("log-seed-5", minutesAgo(54), "Login failed", sameer, "Incorrect password · attempt 2 of 5"),
    makeEntry("log-seed-6", minutesAgo(53), "Login successful", sameer, DEVICES[1]),
    makeEntry("log-seed-7", minutesAgo(120), "Password reset requested", priya, "Reset link sent to priya.nair@hrattendance.example"),
    makeEntry("log-seed-8", minutesAgo(115), "Password changed", priya, "Updated via reset link"),
    makeEntry("log-seed-9", minutesAgo(300), "MFA enabled", aditi, "Authenticator app linked"),
    makeEntry("log-seed-10", minutesAgo(360), "Logout", rohit, "Manual sign-out"),
    makeEntry("log-seed-11", minutesAgo(1440), "Account locked", neha, "5 consecutive failed login attempts"),
    makeEntry("log-seed-12", minutesAgo(1430), "Account unlocked", neha, "Unlocked by admin override"),
    makeEntry("log-seed-13", minutesAgo(1400), "MFA disabled", sameer, "Authenticator app removed"),
    makeEntry("log-seed-14", minutesAgo(1350), "Login successful", aditi, DEVICES[0]),
    makeEntry("log-seed-15", minutesAgo(2800), "Login failed", rohit, "Incorrect password · attempt 1 of 5"),
    makeEntry("log-seed-16", minutesAgo(2850), "Logout", priya, "Session ended"),
    makeEntry("log-seed-17", minutesAgo(4200), "Profile details changed", aditi, "Updated designation"),
  ].sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
}

// Attendance, Requests, and Access & Permissions have no backing store in
// this app yet, so these are a small fixed seed rather than a live feed -
// enough for the module tab/filter to have something real-looking to show.
function buildStaticDemoLogs(): SystemLogEntry[] {
  const aditi = actorFor("emp-1024");
  const rohit = actorFor("emp-1032");
  const neha = actorFor("emp-1045");
  const sameer = actorFor("emp-1051");
  const priya = actorFor("emp-1067");

  return [
    { id: "log-att-1", timestamp: minutesAgo(35), module: "Attendance", event: "Clock in", actor: aditi, department: "Engineering", detail: "Office · 09:04 AM", severity: "info" },
    { id: "log-att-2", timestamp: minutesAgo(180), module: "Attendance", event: "WFH request approved", actor: neha, department: "Human Resources", detail: "WFH request #102 for Rohit Verma", severity: "info" },
    { id: "log-att-3", timestamp: minutesAgo(260), module: "Attendance", event: "Attendance correction requested", actor: rohit, department: "Engineering", detail: "Missed clock-in on Sep 27", severity: "warning" },
    { id: "log-att-4", timestamp: minutesAgo(240), module: "Attendance", event: "Attendance correction approved", actor: neha, department: "Human Resources", detail: "Correction request from Rohit Verma", severity: "info" },
    { id: "log-att-5", timestamp: minutesAgo(600), module: "Attendance", event: "Geofence violation", actor: sameer, department: "Product", detail: "Clock-in attempted 4.2km from office", severity: "warning" },

    { id: "log-req-1", timestamp: minutesAgo(90), module: "Requests", event: "Leave request submitted", actor: priya, department: "Design", detail: "2 days casual leave, Oct 3-4", severity: "info" },
    { id: "log-req-2", timestamp: minutesAgo(70), module: "Requests", event: "Leave request approved", actor: neha, department: "Human Resources", detail: "Approved for Priya Nair", severity: "info" },
    { id: "log-req-3", timestamp: minutesAgo(500), module: "Requests", event: "Leave request rejected", actor: neha, department: "Human Resources", detail: "Rejected for Sameer Iyer - insufficient balance", severity: "warning" },
    { id: "log-req-4", timestamp: minutesAgo(1000), module: "Requests", event: "Access request submitted", actor: aditi, department: "Engineering", detail: "Requested access to deployment dashboard", severity: "info" },
    { id: "log-req-5", timestamp: minutesAgo(950), module: "Requests", event: "Access request approved", actor: rohit, department: "Engineering", detail: "Approved for Aditi Sharma", severity: "info" },

    { id: "log-acc-1", timestamp: minutesAgo(1600), module: "Access & Permissions", event: "Role changed", actor: SUPER_ADMIN, detail: "Neha Kapoor's role changed to HR", severity: "warning" },
    { id: "log-acc-2", timestamp: minutesAgo(2000), module: "Access & Permissions", event: "Permission changed", actor: SUPER_ADMIN, detail: "Manager role: enabled manageLifecycle", severity: "warning" },
    { id: "log-acc-3", timestamp: minutesAgo(2400), module: "Access & Permissions", event: "Access granted", actor: SUPER_ADMIN, detail: "Granted Rohit Verma access to Org Structure", severity: "info" },
    { id: "log-acc-4", timestamp: minutesAgo(3000), module: "Access & Permissions", event: "Access revoked", actor: SUPER_ADMIN, detail: "Revoked Sameer Iyer's asset-management access", severity: "critical" },
  ];
}

const EVENT_TYPES = Object.keys(EVENT_INFO) as LogEventType[];
const MAX_AUTH_LOGS = 200;
const MIN_GENERATION_GAP_MS = 90_000; // don't add a synthetic event more than once per ~90s

let authLogs: SystemLogEntry[] = buildSeedAuthLogs();
let lastGeneratedAt = Date.now();
let counter = 0;

function detailFor(event: LogEventType): string | undefined {
  switch (event) {
    case "Login successful":
    case "Login failed":
      return randomDevice();
    case "Password reset requested":
      return "Reset link sent";
    case "Password changed":
      return "Updated via account settings";
    case "Account locked":
      return "5 consecutive failed login attempts";
    case "Account unlocked":
      return "Unlocked by admin override";
    case "Session expired":
      return "Idle for 30 minutes";
    case "MFA enabled":
      return "Authenticator app linked";
    case "MFA disabled":
      return "Authenticator app removed";
    case "Profile details changed":
      return "Updated contact details";
    default:
      return undefined;
  }
}

// Only auth events are in the live-generation pool - fabricating random
// Employees/Work events here would drift out of sync with what's actually
// in those stores, unlike the real derived logs below.
const AUTH_EVENT_TYPES: LogEventType[] = EVENT_TYPES.filter((e) => EVENT_INFO[e]?.module === "Authentication");

function generateAuthEntry(): SystemLogEntry {
  counter += 1;
  const event = AUTH_EVENT_TYPES[Math.floor(Math.random() * AUTH_EVENT_TYPES.length)];
  const actor = randomActor();
  return makeEntry(`log-live-${Date.now()}-${counter}`, new Date().toISOString(), event, actor, detailFor(event));
}

function describeLifecycleEvent(event: LifecycleEvent): { logEvent: LogEventType; severity: LogSeverity } {
  const type = event.type as LifecycleEventType;
  switch (type) {
    case "Joined":
      return { logEvent: "Employee added", severity: "info" };
    case "Onboarding completed":
      return { logEvent: "Onboarding completed", severity: "info" };
    case "Confirmed":
      return { logEvent: "Confirmed", severity: "info" };
    case "Transferred":
      return { logEvent: "Transferred", severity: "info" };
    case "Promoted":
      return { logEvent: "Promoted", severity: "info" };
    case "Designation changed":
      return { logEvent: "Designation changed", severity: "info" };
    case "Manager changed":
      return { logEvent: "Manager changed", severity: "info" };
    case "Location changed":
      return { logEvent: "Location changed", severity: "info" };
    case "Separation initiated":
      return { logEvent: "Separation initiated", severity: "warning" };
    case "Exited":
      return { logEvent: "Exited", severity: "warning" };
    case "F&F settled":
      return { logEvent: "F&F settled", severity: "info" };
    case "Status changed":
      return { logEvent: "Status changed", severity: "info" };
    case "Deactivated":
      return { logEvent: "Deactivated", severity: "critical" };
    case "Reactivated":
      return { logEvent: "Reactivated", severity: "info" };
    case "Profile updated by employee":
      return { logEvent: "Profile details changed", severity: "info" };
    default:
      return { logEvent: "Designation changed", severity: "info" };
  }
}

// Real, computed fresh from `employee-store.ts` every call - every
// employee's lifecycle history (joining, onboarding, promotions, exits, ...)
// becomes one log entry. The performer is always "Super Admin" (there's no
// real auth/session system to attribute it to anyone else yet); the
// employee the event is about is named in `detail` and lends their
// department to the entry so department filtering still works.
async function getEmployeesModuleLogs(): Promise<SystemLogEntry[]> {
  const employees = await getEmployeeOverviews();
  const entries: SystemLogEntry[] = [];
  for (const emp of employees) {
    for (const event of emp.lifecycleHistory) {
      const { logEvent, severity } = describeLifecycleEvent(event);
      entries.push({
        id: `log-emp-${event.id}`,
        timestamp: event.date,
        module: "Employees",
        event: logEvent,
        actor: SUPER_ADMIN,
        department: emp.department,
        detail: `${emp.name}${event.detail ? ` — ${event.detail}` : ""}`,
        severity,
      });
    }
  }
  return entries;
}

// Real, computed fresh from `work-store.ts` every call. Creation and status
// changes are attributed to "Super Admin" (the only one who can make them -
// see `src/lib/hr/work-store.ts`); summary updates are the one thing an
// assignee genuinely performs themselves, so those carry the assignee's own
// name/department as actor.
async function getWorkModuleLogs(): Promise<SystemLogEntry[]> {
  const [projects, tasks, employees] = await Promise.all([getProjects(), getTasks(), getEmployeeOverviews()]);
  const employeesById = new Map(employees.map((e) => [e.id, e]));
  const projectsById = new Map(projects.map((p) => [p.id, p]));
  const entries: SystemLogEntry[] = [];

  for (const project of projects) {
    entries.push({
      id: `log-proj-${project.id}-created`,
      timestamp: project.createdOn,
      module: "Work & Projects",
      event: "Project created",
      actor: SUPER_ADMIN,
      detail: `"${project.name}"`,
      severity: "info",
    });
  }

  for (const task of tasks) {
    const projectName = projectsById.get(task.projectId)?.name ?? "an unlinked project";
    entries.push({
      id: `log-task-${task.id}-created`,
      timestamp: task.createdOn,
      module: "Work & Projects",
      event: "Task created",
      actor: SUPER_ADMIN,
      detail: `"${task.title}" in ${projectName}`,
      severity: "info",
    });
    if (task.summaryUpdatedAt) {
      const [firstId, ...rest] = task.assigneeIds;
      const first = employeesById.get(firstId);
      entries.push({
        id: `log-task-${task.id}-summary`,
        timestamp: task.summaryUpdatedAt,
        module: "Work & Projects",
        event: "Task summary updated",
        actor: first ? { id: first.id, name: first.name, initials: first.initials } : SUPER_ADMIN,
        department: first?.department,
        detail: `"${task.title}"${rest.length > 0 ? ` (co-assigned: ${rest.length})` : ""}`,
        severity: "info",
      });
    }
    if (task.status === "Completed") {
      entries.push({
        id: `log-task-${task.id}-completed`,
        timestamp: task.updatedAt,
        module: "Work & Projects",
        event: "Task completed",
        actor: SUPER_ADMIN,
        detail: `"${task.title}"`,
        severity: "info",
      });
    }
  }

  return entries;
}

function actorFromPerformedBy(performedBy: string): LogActor {
  const name = performedBy.split(" (")[0].trim() || performedBy;
  const initials = name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return { id: `role-${name.toLowerCase().replace(/\s+/g, "-")}`, name, initials: initials || "NA" };
}

const ANNOUNCEMENT_EVENT: Record<AnnouncementHistoryEventType, LogEventType> = {
  Created: "Announcement created",
  Edited: "Announcement edited",
  Published: "Announcement published",
  Scheduled: "Announcement scheduled",
  Archived: "Announcement archived",
};

// Real, computed fresh from `announcement-store.ts` every call. The actor is
// whichever role posted it (HR/Manager/Super Admin - see
// `AnnouncementCreatorRole`), not a specific employee, so there's no
// department to attach here (same as the other Super-Admin-attributed
// entries above) - individual reads aren't logged as discrete events (there
// could be hundreds per announcement), only the lifecycle transitions.
async function getAnnouncementModuleLogs(): Promise<SystemLogEntry[]> {
  const announcements = await getAnnouncements();
  const entries: SystemLogEntry[] = [];
  for (const announcement of announcements) {
    for (const event of announcement.history) {
      entries.push({
        id: `log-ann-${event.id}`,
        timestamp: event.timestamp,
        module: "Announcements",
        event: ANNOUNCEMENT_EVENT[event.type],
        actor: actorFromPerformedBy(event.performedBy),
        detail: `"${announcement.title}"${event.detail ? ` — ${event.detail}` : ""}`,
        severity: event.type === "Archived" ? "warning" : "info",
      });
    }
  }
  return entries;
}

// Export events are real too - recorded on demand when a CSV export
// actually happens (see `/api/superadmin/logs/export`), not derived.
export async function recordExportEvent(detail: string): Promise<SystemLogEntry> {
  const entry = makeEntry(`log-export-${Date.now()}-${Math.round(Math.random() * 1e6)}`, new Date().toISOString(), "Data exported", SUPER_ADMIN, detail);
  const existing = await readExportLogs();
  await writeExportLogs([entry, ...existing].slice(0, 100));
  return entry;
}

// Enrich every entry with its actor's current department, looked up live
// (an employee's department can change after a log entry was written, and
// this keeps every source - auth, seed, derived - consistent without each
// one needing its own lookup).
async function withDepartments(entries: SystemLogEntry[]): Promise<SystemLogEntry[]> {
  const employees = await getEmployeeOverviews();
  const deptById = new Map(employees.map((e) => [e.id, e.department]));
  return entries.map((entry) =>
    entry.department === undefined && deptById.has(entry.actor.id)
      ? { ...entry, department: deptById.get(entry.actor.id) }
      : entry,
  );
}

export async function getSystemLogs(): Promise<SystemLogEntry[]> {
  const now = Date.now();
  if (now - lastGeneratedAt >= MIN_GENERATION_GAP_MS) {
    lastGeneratedAt = now;
    authLogs = [generateAuthEntry(), ...authLogs].slice(0, MAX_AUTH_LOGS);
  }

  const [employeeLogs, workLogs, announcementLogs, exportLogs] = await Promise.all([
    getEmployeesModuleLogs(),
    getWorkModuleLogs(),
    getAnnouncementModuleLogs(),
    readExportLogs(),
  ]);
  const merged = [
    ...authLogs,
    ...buildStaticDemoLogs(),
    ...employeeLogs,
    ...workLogs,
    ...announcementLogs,
    ...exportLogs,
  ].sort((a, b) =>
    a.timestamp < b.timestamp ? 1 : -1,
  );
  return withDepartments(merged);
}
