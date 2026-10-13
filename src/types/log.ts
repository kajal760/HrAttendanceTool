// System activity log - what's happening across the app, for the Super
// Admin "Log" page. One unified feed, split by `module` (surfaced as both
// horizontal tabs and a matching filter dropdown - the tabs are just
// shortcuts for the same underlying filter) with a further Department /
// Event Type / Actor / Severity / Date range filter set on top.

export type LogModule =
  | "Authentication"
  | "Account"
  | "Employees"
  | "Work & Projects"
  | "Announcements"
  | "Attendance"
  | "Requests"
  | "Access & Permissions"
  | "Export";

export const LOG_MODULES: LogModule[] = [
  "Authentication",
  "Account",
  "Employees",
  "Work & Projects",
  "Announcements",
  "Attendance",
  "Requests",
  "Access & Permissions",
  "Export",
];

export type LogEventType =
  // Authentication
  | "Login successful"
  | "Login failed"
  | "Logout"
  | "Password changed"
  | "Password reset requested"
  | "Account locked"
  | "Account unlocked"
  | "Session expired"
  | "MFA enabled"
  | "MFA disabled"
  // Account
  | "Profile details changed"
  // Employees - mirrors `LifecycleEventType` in `src/types/hr.ts`, plus the
  // one event ("Added") that predates any lifecycle history existing.
  | "Employee added"
  | "Onboarding completed"
  | "Confirmed"
  | "Transferred"
  | "Promoted"
  | "Designation changed"
  | "Status changed"
  | "Manager changed"
  | "Location changed"
  | "Separation initiated"
  | "Exited"
  | "F&F settled"
  | "Deactivated"
  | "Reactivated"
  // Work & Projects
  | "Project created"
  | "Task created"
  | "Task status changed"
  | "Task completed"
  | "Task summary updated"
  // Announcements
  | "Announcement created"
  | "Announcement edited"
  | "Announcement published"
  | "Announcement scheduled"
  | "Announcement archived"
  // Attendance (seed/demo only - no attendance store exists yet)
  | "Clock in"
  | "Clock out"
  | "Attendance correction requested"
  | "Attendance correction approved"
  | "WFH request approved"
  | "Geofence violation"
  // Requests (seed/demo only - no requests store exists yet)
  | "Leave request submitted"
  | "Leave request approved"
  | "Leave request rejected"
  | "Access request submitted"
  | "Access request approved"
  // Access & Permissions (seed/demo only - role edits aren't audited yet)
  | "Role changed"
  | "Permission changed"
  | "Access granted"
  | "Access revoked"
  // Export
  | "Data exported";

export type LogSeverity = "info" | "warning" | "critical";

export interface LogActor {
  id: string;
  name: string;
  initials: string;
}

export interface SystemLogEntry {
  id: string;
  timestamp: string; // ISO
  module: LogModule;
  event: LogEventType;
  actor: LogActor;
  department?: string; // the actor's department, when they have one (a "Super Admin" system action doesn't)
  detail?: string;
  severity: LogSeverity;
}
