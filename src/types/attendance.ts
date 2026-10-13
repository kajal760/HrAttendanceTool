// Attendance and leave history shown on employee profiles.

export const LEAVE_CATEGORIES = [
  "Casual",
  "Sick",
  "Compensatory",
  "Mandatory",
  "Birthday",
  "Work Anniversary",
] as const;
export type LeaveCategory = (typeof LEAVE_CATEGORIES)[number];

export type LeaveStatus = "Pending" | "Approved" | "Rejected";

export interface LeaveRequest {
  id: string;
  category: LeaveCategory;
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD
  days: number;
  status: LeaveStatus;
  appliedOn: string; // YYYY-MM-DD
}

export type AttendanceDayStatus = "Present" | "Late" | "WFH" | "Absent" | "On Leave";

export interface AttendanceDay {
  date: string; // YYYY-MM-DD
  status: AttendanceDayStatus;
}

export interface AttendanceHistory {
  leaves: LeaveRequest[];
  days: AttendanceDay[]; // most recent first
  summary: {
    present: number;
    late: number;
    wfh: number;
    absent: number;
    onLeave: number;
    leaveTaken: number; // approved leave days
    leavePending: number; // pending requests
    leavePendingDays: number;
    leaveRejected: number;
  };
}
