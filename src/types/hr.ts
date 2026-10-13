// Types for the HR (admin) module - company-wide views, as opposed to the
// single-employee self-service views under `src/types/employee.ts`.

import type { ProjectRollupStatus, WorkTaskDisplayStatus } from "@/types/work";

export interface TrendPoint {
  label: string; // x-axis tick, e.g. a short month name
  value: number;
}

export interface CategoryCount {
  label: string;
  value: number;
}

export interface HrSummaryCard {
  id: string;
  label: string;
  value: string;
  meta?: string;
  icon: "employees" | "attendance" | "requests" | "tasks" | "projects" | "onboarding";
}

export interface DepartmentOverviewRow {
  name: string;
  employeeCount: number;
  attendancePct: number; // average across the department, 0-100
  performancePct: number; // average across the department, 0-100
}

export interface RecentActivityEntry {
  id: string;
  timestamp: string; // ISO
  description: string;
}

export interface HrDashboardData {
  summaryCards: HrSummaryCard[];
  attendanceTrend: TrendPoint[];
  attendanceBreakdown: CategoryCount[]; // Present / WFH / On Leave / Late / Absent, today
  requestsByType: CategoryCount[];
  projectStatusCounts: Record<ProjectRollupStatus, number>;
  taskStatusBreakdown: Record<WorkTaskDisplayStatus, number>;
  departmentOverview: DepartmentOverviewRow[];
  recentActivity: RecentActivityEntry[];
  pendingRequestCount: number;
}

// --- Employees directory (super admin view) --------------------------------

// Doubles as the lifecycle stage: Joining lands an employee at "Onboarding",
// Confirmation moves Probation -> Active, Separation moves
// Active/On Leave -> Notice Period -> Resigned/Exited. Transfer, promotion,
// and designation/manager changes don't change status - they're logged as
// LifecycleEvents instead (see below) without moving the employee off the
// Active track.
export type EmployeeStatus =
  | "Onboarding"
  | "Probation"
  | "Active"
  | "On Leave"
  | "Notice Period"
  | "Resigned"
  | "Exited";

export type WorkType = "Office" | "Hybrid" | "WFH";

export interface EmergencyContact {
  name: string;
  relation: string;
  phone: string;
}

export interface EducationRecord {
  id: string;
  degree: string;
  institution: string;
  year: string;
}

export interface ExperienceRecord {
  id: string;
  company: string;
  role: string;
  durationYears: number;
}

export interface OnboardingTask {
  id: string;
  label: string;
  done: boolean;
}

export type LifecycleEventType =
  | "Joined"
  | "Onboarding completed"
  | "Confirmation updated"
  | "Confirmed"
  | "Transferred"
  | "Promoted"
  | "Designation changed"
  | "Manager changed"
  | "Location changed"
  | "Role changed"
  | "Status changed"
  | "Separation initiated"
  | "Exit checklist updated"
  | "Exited"
  | "F&F settled"
  | "Deactivated"
  | "Reactivated"
  // Self-service: the employee edited their own personal/contact details
  // from /employee/profile (see `/api/employee/profile`). Distinct from the
  // HR/Manager-driven events above - `performedBy` is the employee's own
  // name, not "Super Admin".
  | "Profile updated by employee";

// --- Employee Lifecycle module (Employees -> Lifecycle) --------------------

export type ConfirmationStatus = "Probation" | "Confirmation Due" | "Confirmed" | "Extended";

export type ExitChecklistCategory = "Handover" | "Assets" | "Access" | "HR";
export type ExitChecklistItemStatus = "Pending" | "In Progress" | "Completed";

export interface ExitChecklistItem {
  id: string;
  category: ExitChecklistCategory;
  label: string;
  status: ExitChecklistItemStatus;
}

// An append-only audit trail entry - who did what to this employee record,
// when. `performedBy` is a placeholder ("Super Admin") until real auth
// exists, same convention as the document/log stores.
export interface LifecycleEvent {
  id: string;
  date: string; // ISO
  type: LifecycleEventType;
  detail?: string;
  // Populated for field-level changes (transfer, promotion, confirmation,
  // role change) so the Employment Changes table and Activity/Audit History
  // can show a real "before -> after" instead of parsing `detail` text.
  // Older events (and ones with no single before/after, like "Joined") just
  // won't have these - the UI falls back to "-".
  previousValue?: string;
  newValue?: string;
  performedBy: string;
}

// A manager-defined ad-hoc field - lets HR track something the fixed schema
// doesn't cover (e.g. "T-shirt size") without a schema change per field.
export interface EmployeeCustomField {
  label: string;
  value: string;
}

export interface ExitDetails {
  // Set when HR deletes the employee record. The record moves to Exited with
  // a marker instead of being erased, so lifecycle history is kept.
  deletedOn?: string; // ISO
  deletedReason?: string;
  resignationDate?: string; // YYYY-MM-DD
  initiatedOn?: string; // ISO
  lastWorkingDay?: string; // YYYY-MM-DD
  noticePeriodDays?: number;
  reason?: string;
  remarks?: string;
  checklist?: ExitChecklistItem[];
  fnfSettled?: boolean;
  fnfAmount?: number;
  fnfNotes?: string;
}

// The compact snapshot a super admin needs at a glance, one card per
// employee - not the full HR record, just what's necessary to spot who
// needs attention. The Employee Master detail page reads the same record
// for the fuller profile (personal/contact/education/experience/lifecycle).
export interface EmployeeOverview {
  id: string;
  // The unique employee ID HR types in when creating the record. `id` is the
  // internal key; this is what people see and search by.
  employeeCode: string;
  name: string;
  initials: string;
  photoUrl?: string;
  email: string;
  department: string;
  designation: string;
  status: EmployeeStatus;
  joinedOn: string; // YYYY-MM-DD
  age: number;
  salary: number; // annual CTC, INR
  performanceScore: number; // 0-100
  attendancePct: number; // this month, 0-100
  leave: { remaining: number; allocated: number };
  tasks: { completed: number; active: number; completionPct: number };
  pendingRequests: number;

  // Employee Master fields
  phone?: string;
  personalEmail?: string;
  dateOfBirth?: string; // YYYY-MM-DD
  gender?: string;
  maritalStatus?: string;
  currentAddress?: string;
  permanentAddress?: string;
  emergencyContact?: EmergencyContact;
  education: EducationRecord[];
  experience: ExperienceRecord[];
  managerId?: string | null;
  location?: string;
  workType?: WorkType;
  employmentType?: string; // e.g. "Full-time", "Contract", "Intern"
  grade?: string;
  skills: string[];
  onboardingTasks: OnboardingTask[];
  lifecycleHistory: LifecycleEvent[];
  deactivated: boolean;
  exit?: ExitDetails;
  customFields?: EmployeeCustomField[];

  // Probation / confirmation tracking (Employees -> Lifecycle -> Employment
  // Changes -> Confirmation).
  probationStartDate?: string; // YYYY-MM-DD
  probationEndDate?: string; // YYYY-MM-DD
  confirmationDate?: string; // YYYY-MM-DD
  confirmationStatus?: ConfirmationStatus;
}

// --- Departments (super admin view) -----------------------------------------
// Membership isn't a foreign key - an employee belongs to a department when
// `EmployeeOverview.department` equals `Department.name` (same string-match
// convention the dashboard's department rollup and the org chart already
// use), so renaming a department cascades to every member's record instead
// of leaving them pointing at a stale name.

export interface Department {
  id: string;
  name: string;
  description?: string;
  headId?: string | null; // an employee id, not necessarily a current member
  archived: boolean;
  createdOn: string; // ISO
}

// --- Org registries (departments / designations / locations) ---------------

export interface OrgRegistryItem {
  id: string;
  name: string;
}

export type OrgRegistryResource = "departments" | "designations" | "locations";

// --- Roles & permissions ----------------------------------------------------
// A reference matrix an admin can edit - it is NOT enforced anywhere in the
// app (there's no auth/session system yet to enforce it against). It exists
// so HR can document/plan access policy ahead of a future auth layer.

export type RoleName = "HR" | "Admin" | "Manager" | "Employee";

export interface RoleFeature {
  key: string;
  label: string;
}

export type RolePermissionsMatrix = Record<RoleName, Record<string, boolean>>;

// --- Org structure chart (super admin view) ---------------------------------

export interface OrgChartPerson {
  id: string;
  name: string;
  initials: string;
  designation: string;
}

export interface OrgChartDepartment {
  name: string;
  employees: OrgChartPerson[];
}

export interface OrgChartData {
  executive: { name: string; initials: string; title: string };
  departments: OrgChartDepartment[];
}
