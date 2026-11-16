// Attendance and leave history shown on employee profiles.

// Same category vocabulary as the real Leave module (`@/types/employee`) -
// re-exported rather than duplicated, so adding a leave category there
// (e.g. Leave Without Pay) can't silently drift out of sync with this
// view's category list the way the old locally-duplicated enum did.
export type { LeaveCategory } from "@/types/employee";
import type { LeaveCategory } from "@/types/employee";

export type LeaveStatus = "Pending" | "Approved" | "Rejected" | "Cancelled";

export interface LeaveHistoryEntry {
  id: string;
  category: LeaveCategory;
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD
  days: number;
  status: LeaveStatus;
  appliedOn: string; // YYYY-MM-DD
}

export type AttendanceHistoryDayStatus = "Present" | "Late" | "Half Day" | "WFH" | "Absent" | "On Leave" | "Holiday";

export interface AttendanceDay {
  date: string; // YYYY-MM-DD
  status: AttendanceHistoryDayStatus;
}

export interface AttendanceHistory {
  leaves: LeaveHistoryEntry[];
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
