// Shared types for the Employee (self-service) module.
// Implemented by `src/lib/employee/dashboard-data.ts`, mostly against real
// backend endpoints - see that file's comments for the few widgets
// (software licenses, company events, asset requests) that have no backend
// data source yet and come back empty.

import type { WorkTaskSummary } from "@/types/work";

export type WorkMode = "Office" | "Work From Home";

export type HistoryEntryType = "attendance" | "leave" | "task" | "policy";

export interface EmployeeProfile {
  id: string;
  name: string;
  initials: string;
  designation: string;
  department: string;
}

export interface TodayAttendance {
  clockedIn: boolean;
  clockInTime?: string;
  workMode?: WorkMode;
}

export interface LeaveTypeBalance {
  type: string;
  allocated: number;
  used: number;
  remaining: number;
}

export interface LeaveSummary {
  totalAllocated: number;
  totalUsed: number;
  totalRemaining: number;
  // Rounded 0-100, totalUsed / totalAllocated - the leave-usage meter and
  // the 80%-used warning (employee popup, HR headcount stat) both key off
  // this one number.
  percentUsed: number;
  byType: LeaveTypeBalance[];
}

export interface HistoryEntry {
  id: string;
  date: string;
  type: HistoryEntryType;
  description: string;
  meta?: string;
}

export interface EmployeeDashboardData {
  profile: EmployeeProfile;
  today: TodayAttendance;
  leave: LeaveSummary;
  tasks: WorkTaskSummary;
  history: HistoryEntry[];
}

// --- Attendance & Time Management ---------------------------------------

export type AttendanceLiveStatus =
  | "idle"
  | "clocked-in"
  | "on-break"
  | "clocked-out";

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface BreakSession {
  id: string;
  startedAt: string; // ISO
  endedAt?: string; // ISO, absent while the break is running
}

export interface TodaySession {
  status: AttendanceLiveStatus;
  workMode: WorkMode;
  clockInAt?: string; // ISO
  clockOutAt?: string; // ISO
  location?: GeoPoint;
  breaks: BreakSession[];
}

export type AttendanceDayStatus = "Present" | "Half Day" | "Absent" | "On Leave";

export interface AttendanceLogEntry {
  id: string;
  date: string; // YYYY-MM-DD
  clockIn?: string; // ISO
  clockOut?: string; // ISO
  workMode: WorkMode;
  breakMinutes: number;
  netHours: number;
  status: AttendanceDayStatus;
}

// --- Asset Management -----------------------------------------------------

export type AssetType =
  | "Laptop"
  | "Phone"
  | "ID Card"
  | "Access Card"
  | "Monitor"
  | "Other";

export type AssetCondition = "New" | "Good" | "Fair" | "Needs Repair";

export type AssetStatus = "Allocated" | "Returned" | "Lost" | "Damaged";

export interface AssetItem {
  id: string;
  type: AssetType;
  name: string;
  assetTag: string; // serial / asset code
  status: AssetStatus;
  allocatedOn: string; // YYYY-MM-DD
  returnedOn?: string; // YYYY-MM-DD
  // The backend doesn't track condition - only set when it can be inferred
  // from asset status (e.g. currently under repair).
  condition?: AssetCondition;
}

export type LicenseStatus = "Active" | "Expiring Soon" | "Expired";

export interface SoftwareLicense {
  id: string;
  name: string;
  seat: string; // plan/tier, e.g. "E3", "Individual"
  assignedOn: string; // YYYY-MM-DD
  expiresOn?: string; // YYYY-MM-DD, absent = perpetual/no fixed expiry
  status: LicenseStatus;
}

export type AssetHistoryAction =
  | "Allocated"
  | "Returned"
  | "Reported Lost"
  | "Reported Damaged"
  | "Repaired";

export interface AssetHistoryEntry {
  id: string;
  date: string; // YYYY-MM-DD
  assetName: string;
  action: AssetHistoryAction;
  note?: string;
}

export type AssetRequestType =
  | "New Asset"
  | "Return"
  | "Report Lost"
  | "Technical Issue"
  | "Report Damaged"
  | "Replacement";

export type AssetRequestStatus = "Pending" | "Approved" | "Rejected";

export interface AssetRequest {
  id: string;
  // Absent for a "New Asset" request - there's no existing asset to point
  // at yet, just the free-text `assetName` of what's being asked for.
  assetId?: string;
  assetName: string;
  type: AssetRequestType;
  note: string;
  status: AssetRequestStatus;
  submittedAt: string; // ISO
}

// --- Company directory & birthdays ----------------------------------------

export interface DirectoryPerson {
  id: string;
  name: string;
  initials: string;
  email: string;
  department: string;
  birthdateMonthDay: string; // "MM-DD", recurring yearly
}

export interface UpcomingBirthday extends DirectoryPerson {
  isToday: boolean;
  daysUntil: number;
}

// --- Contact HR / requests -------------------------------------------------

export type HrRequestCategory =
  | "Leave"
  | "Work From Office"
  | "Work From Home"
  | "Query"
  | "Other";

export interface RequestRecipient {
  id: string;
  label: string; // "HR", "CFO", or a colleague's name
  email: string;
}

// No approve/reject flow yet - every request just sits as "Pending" until
// there's a real inbox on the other end to route it to.
export type HrRequestStatus = "Pending";

export interface HrRequest {
  id: string;
  category: HrRequestCategory;
  otherLabel?: string; // set when category is "Other"
  summary: string;
  recipients: RequestRecipient[];
  status: HrRequestStatus;
  submittedAt: string; // ISO
}

// --- Leave Management --------------------------------------------------
// Leave types and their rules (yearly quota, half days, certificates,
// maternity) are defined by the backend's `leave_types` table - a category
// is that type's name, e.g. "Casual Leave". Distinct from the free-text
// "Leave" option on the generic HR Requests form above.

export type LeaveCategory = string;

export interface LeaveTypeOption {
  id: string;
  code: string;
  name: string;
  description?: string;
  annualQuota: number | null;
  maxDaysPerRequest: number | null;
  allowHalfDay: boolean;
  certificateRequiredAfterDays: number | null;
  // Maternity: needs the expected delivery date.
  needsExpectedDeliveryDate: boolean;
}

export type LeaveRequestStatus = "Pending" | "Approved" | "Rejected" | "Cancelled";

export type HalfDaySession = "First Half" | "Second Half";

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  category: LeaveCategory;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  days: number; // working days (calendar days for maternity); 0.5 for a half day
  reason: string;
  status: LeaveRequestStatus;
  submittedAt: string; // ISO
  decidedBy?: string;
  decidedAt?: string; // ISO
  decisionNote?: string;
  halfDaySession?: HalfDaySession;
  expectedDeliveryDate?: string; // YYYY-MM-DD
  hasAttachment: boolean;
  // Policy says this request needs a medical certificate before approval.
  certificateRequired: boolean;
}

// --- Company holidays & events ------------------------------------------

export type HolidayType = "Public" | "Optional";

export interface CompanyHoliday {
  id: string;
  name: string;
  date: string; // YYYY-MM-DD
  type: HolidayType;
}

export interface CompanyEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  category: "Townhall" | "Team Outing" | "Training" | "Celebration";
  location?: string;
}

// --- Attendance calendar & monthly stats (dashboard widgets) -------------

export type AttendanceCalendarDayStatus = AttendanceDayStatus | "Weekend" | "Holiday" | "Upcoming";

export interface AttendanceCalendarDay {
  date: string; // YYYY-MM-DD
  status: AttendanceCalendarDayStatus;
  label?: string; // holiday/leave name, shown on hover
}

export interface DailyHoursPoint {
  date: string; // YYYY-MM-DD
  label: string; // short weekday label, e.g. "Mon"
  hours: number;
}
