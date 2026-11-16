// Response shapes of the FastAPI backend (camelCase JSON). Mapped onto the
// app's own types in the `@/lib/hr/*-store` adapters, so components never
// see these directly.

import type { EmployeeStatus, WorkType } from "@/types/hr";
import type { Role } from "@/types/auth";

export interface ApiEmployee {
  id: string;
  employeeCode: string;
  name: string;
  email: string;
  department: string | null;
  designation: string | null;
  status: EmployeeStatus;
  deactivated: boolean;
  phone: string | null;
  personalEmail: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  maritalStatus: string | null;
  currentAddress: string | null;
  permanentAddress: string | null;
  emergencyContact: { name: string; relation: string; phone: string } | null;
  departmentId: string | null;
  designationId: string | null;
  locationId: string | null;
  location: string | null;
  managerId: string | null;
  managerName: string | null;
  workType: WorkType | null;
  employmentType: string | null;
  grade: string | null;
  joinedOn: string;
  probationEndDate: string | null;
  confirmationDate: string | null;
  skills: string[];
  education: Record<string, unknown>[];
  experience: Record<string, unknown>[];
  customFields: Record<string, unknown>[];
  loginRole: Role | null;
  salary?: number | null; // Admin/HR only
}

// Thin projection returned by the paginated `GET /employees` (as opposed to
// `ApiEmployee`, the full record `GET /employees/directory` returns).
export interface ApiEmployeeSummary {
  id: string;
  employeeCode: string;
  name: string;
  email: string;
  department: string | null;
  designation: string | null;
  status: EmployeeStatus;
  deactivated: boolean;
}

export interface ApiPage<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
}

export interface ApiRegistryItem {
  id: string;
  name: string;
  archived: boolean;
  createdAt: string;
}

export interface ApiDepartment extends ApiRegistryItem {
  description: string | null;
  headId: string | null;
  archivedAt: string | null;
}

export interface ApiDepartmentArchiveImpact {
  employeeCount: number;
}

export interface ApiLeaveType {
  id: string;
  code: string;
  name: string;
  description: string | null;
  annualQuota: number | null;
  minDaysPerRequest: number | null;
  maxDaysPerRequest: number | null;
  allowHalfDay: boolean;
  certificateRequiredAfterDays: number | null;
  countsCalendarDays: boolean;
  perOccurrenceDays: number | null;
  maxOccurrences: number | null;
  maxDaysBeforeEvent: number | null;
  isPaid: boolean;
  isActive: boolean;
}

export type ApiLeaveStatus = "Pending" | "Approved" | "Rejected" | "Cancelled";

export interface ApiLeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  leaveTypeId: string;
  category: string;
  startDate: string;
  endDate: string;
  halfDaySession: "First Half" | "Second Half" | null;
  days: number;
  reason: string;
  status: ApiLeaveStatus;
  expectedDeliveryDate: string | null;
  hasAttachment: boolean;
  certificateRequired: boolean;
  submittedAt: string;
  decidedBy: string | null;
  decidedAt: string | null;
  decisionNote: string | null;
}

export interface ApiLeaveBalance {
  leaveTypeId: string;
  code: string;
  type: string;
  allocated: number | null;
  used: number;
  pending: number;
  remaining: number | null;
  occurrencesUsed: number | null;
  maxOccurrences: number | null;
}

export interface ApiLeaveSummary {
  year: number;
  totalAllocated: number;
  totalUsed: number;
  totalRemaining: number;
  percentUsed: number;
  byType: ApiLeaveBalance[];
}

export interface ApiLeaveTotals {
  employeeId: string;
  totalAllocated: number;
  totalUsed: number;
  totalPending: number;
  totalRemaining: number;
  percentUsed: number;
}

export type ApiAttendanceStatus = "Present" | "Late" | "Half Day" | "Absent" | "On Leave" | "Holiday" | "Weekend";

export interface ApiBreak {
  id: string;
  startedAt: string;
  endedAt: string | null;
}

export interface ApiAttendanceRecord {
  id: string;
  employeeId: string;
  date: string;
  clockIn: string;
  clockOut: string | null;
  workMode: "Office" | "Work From Home";
  locationCaptured: boolean;
  location: string | null;
  onBreak: boolean;
  breakMinutes: number;
  netHours: number;
  status: ApiAttendanceStatus;
  breaks: ApiBreak[];
}

export interface ApiTodayAttendance {
  clockedIn: boolean;
  clockedOut: boolean;
  record: ApiAttendanceRecord | null;
}

export interface ApiAttendanceDay {
  date: string;
  status: ApiAttendanceStatus | null;
  label: string | null;
  record: ApiAttendanceRecord | null;
}

export interface ApiAttendanceHistory {
  employeeId: string;
  days: ApiAttendanceDay[]; // most recent first
  summary: {
    present: number;
    late: number;
    halfDay: number;
    absent: number;
    onLeave: number;
    holidays: number;
    totalHours: number;
  };
}

export interface ApiRosterRow {
  employeeId: string;
  employeeCode: string;
  name: string;
  department: string | null;
  date: string;
  status: ApiAttendanceStatus | null;
  label: string | null;
  record: ApiAttendanceRecord | null;
}

export interface ApiHoliday {
  id: string;
  date: string;
  name: string;
  type: "Bank" | "Regional";
  note: string | null;
  selected: boolean | null;
}

export interface ApiAnnouncementAudience {
  type: "Everyone" | "Department" | "Team" | "Employees" | "Managers" | "HR";
  department?: string | null;
  managerId?: string | null;
  employeeIds?: string[] | null;
}

export interface ApiAnnouncementAttachment {
  id: string;
  name: string;
  url: string;
  sizeBytes: number;
  contentType: string;
}

export interface ApiAnnouncementHistoryEntry {
  id: string;
  timestamp: string;
  type: "Created" | "Edited" | "Published" | "Scheduled" | "Archived";
  performedBy: string;
}

export interface ApiAnnouncement {
  id: string;
  title: string;
  content: string;
  type: string;
  priority: "Normal" | "Important" | "Urgent";
  audience: ApiAnnouncementAudience;
  lifecycle: "Draft" | "Live" | "Archived";
  requireAcknowledgement: boolean;
  publishAt: string;
  expiresAt: string | null;
  attachments: ApiAnnouncementAttachment[];
  createdByName: string;
  createdByRole: string | null;
  createdAt: string;
  updatedAt: string;
  reads: { employeeId: string; readAt: string }[];
  acknowledgements: { employeeId: string; acknowledgedAt: string }[];
  history: ApiAnnouncementHistoryEntry[];
  readByMe: boolean;
}

export interface ApiAssetEvent {
  id: string;
  date: string;
  type: "Added" | "Assigned" | "Returned" | "Sent for repair" | "Repaired" | "Retired";
  ownerId: string | null;
  detail: string | null;
  performedBy: string;
}

export interface ApiAsset {
  id: string;
  assetTag: string;
  name: string;
  category: string;
  deviceMake: string | null;
  model: string | null;
  serialNumber: string | null;
  purchasedOn: string | null;
  status: "Available" | "Assigned" | "Under repair" | "Retired";
  ownerId: string | null;
  ownerName: string | null;
  assignedOn: string | null;
  department: string | null;
  employmentStatus: "Employee" | "Consultant" | null;
  vendor: string | null;
  invoiceDetails: string | null;
  warrantyStartDate: string | null;
  warrantyEndDate: string | null;
  notes: string | null;
  history: ApiAssetEvent[];
}

export interface ApiAssetHistoryFeedEntry extends ApiAssetEvent {
  assetId: string;
  assetTag: string;
  assetName: string;
}

export interface ApiProject {
  id: string;
  name: string;
  description: string | null;
  memberIds: string[];
  departmentName: string | null;
  deadline: string | null;
  // Optional/nullable - older records (or a backend not yet updated for
  // this field) may not have one; the frontend defaults it to "Medium".
  priority?: "High" | "Medium" | "Low" | null;
  createdOn: string;
  createdBy: string;
}

export interface ApiTaskDependsOn {
  id: string;
  title: string;
  status: "Pending" | "Ongoing" | "Completed";
}

export interface ApiWorkTask {
  id: string;
  title: string;
  description: string | null;
  projectId: string;
  projectName: string;
  assigneeIds: string[];
  deadline: string;
  status: "Pending" | "Ongoing" | "Completed";
  priority?: "High" | "Medium" | "Low" | null;
  dependsOnTaskId: string | null;
  dependsOnTask: ApiTaskDependsOn | null;
  summary: string | null;
  summaryUpdatedAt: string | null;
  mentionedIds: string[];
  createdOn: string;
  createdBy: string;
  updatedAt: string;
}

export interface ApiPoshComplaint {
  id: string;
  employeeId: string | null;
  employeeName: string | null;
  anonymous: boolean;
  respondent: string | null;
  description: string;
  status: "Submitted" | "Under Review" | "Resolved";
  submittedAt: string;
  resolutionNote: string | null;
  resolvedBy: string | null;
  resolvedAt: string | null;
}

export interface ApiDocument {
  id: string;
  title: string;
  category: string;
  fileName: string;
  fileUrl: string;
  fileSizeBytes: number;
  uploadedAt: string;
  uploadedBy: string;
  employeeId: string | null;
}

export interface ApiOrgSettings {
  leaveYearStart: string;
  celebrations: {
    birthdaysEnabled: boolean;
    anniversariesEnabled: boolean;
    sendTime: string;
  };
}

export interface ApiTimesheetEntry {
  id: string;
  employeeId: string;
  date: string;
  hours: number;
  description: string;
  taskId: string | null;
  createdAt: string;
  updatedAt: string;
}

export type ApiCorrectionStatus = "Pending" | "Approved" | "Rejected";

export interface ApiCorrectionRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  department: string | null;
  workDate: string;
  requestedClockIn: string | null; // HH:MM:SS
  requestedClockOut: string | null; // HH:MM:SS
  reason: string;
  status: ApiCorrectionStatus;
  currentRecord: ApiAttendanceRecord | null;
  submittedAt: string;
  decidedBy: string | null;
  decidedAt: string | null;
}

// ---------------------------------------------------------------------------
// Training
// ---------------------------------------------------------------------------

export interface ApiTrainingProgramme {
  id: string;
  trainingRef: string;
  name: string;
  category: string;
  description: string | null;
  trainerName: string | null;
  mode: string;
  provider: string | null;
  startDate: string | null;
  endDate: string | null;
  durationHours: number | null;
  cost: number | null;
  isActive: boolean;
  assignmentCount: number;
}

export interface ApiEmployeeTraining {
  id: string;
  programmeId: string;
  programmeName: string;
  trainingRef: string;
  category: string;
  mode: string;
  trainerName: string | null;
  provider: string | null;
  startDate: string | null;
  endDate: string | null;
  durationHours: number | null;
  employeeId: string;
  employeeName: string;
  department: string | null;
  designation: string | null;
  assignedDate: string;
  assignedBy: string | null;
  dueDate: string | null;
  priority: string;
  status: string;
  progress: number;
  attendance: string | null;
  assessmentScore: number | null;
  feedback: string | null;
  trainerRemarks: string | null;
  completionDate: string | null;
  certificateName: string | null;
  certificateRef: string | null;
  certIssueDate: string | null;
  certExpiryDate: string | null;
  hasCertificateFile: boolean;
  certFileName: string | null;
  certVerificationLink: string | null;
}

export interface ApiTrainingDashboard {
  total: number;
  completed: number;
  inProgress: number;
  overdue: number;
  notStarted: number;
}

