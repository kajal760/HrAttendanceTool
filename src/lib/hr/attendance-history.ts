import { backend } from "@/lib/api/backend";
import type { ApiAttendanceHistory } from "@/lib/api/types";
import { getSession } from "@/lib/auth/get-session";
import type { AttendanceDay, AttendanceHistory, AttendanceHistoryDayStatus, LeaveHistoryEntry } from "@/types/attendance";
import type { LeaveRequest } from "@/types/employee";
import { getLeaveRequestsForEmployee } from "./leave-store";

// Attendance and leave history for an employee profile - real clock-in
// records, approved leave and holidays from the backend's per-day history,
// plus the employee's leave requests.

export function hash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function isoDay(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

export function isWeekend(d: Date): boolean {
  return d.getDay() === 0 || d.getDay() === 6;
}

// The signed-in employee's own history goes through `/me`; Admin/HR read anyone's.
export async function fetchAttendanceHistory(employeeId: string, from: string, to: string): Promise<ApiAttendanceHistory> {
  const session = await getSession();
  const path =
    session?.employeeId === employeeId ? "/attendance/me/history" : `/attendance/employees/${employeeId}/history`;
  return backend<ApiAttendanceHistory>(path, { query: { from, to } });
}

function toViewLeave(r: LeaveRequest): LeaveHistoryEntry {
  return {
    id: r.id,
    category: r.category,
    from: r.startDate,
    to: r.endDate,
    days: r.days,
    status: r.status,
    appliedOn: r.submittedAt.slice(0, 10),
  };
}

// The last 30 working days (most recent first) and every leave request.
export async function getAttendanceHistory(employeeId: string, today: Date = new Date()): Promise<AttendanceHistory> {
  const [history, requests] = await Promise.all([
    fetchAttendanceHistory(employeeId, isoDay(addDays(today, -60)), isoDay(today)),
    getLeaveRequestsForEmployee(employeeId),
  ]);
  const leaves = requests.map(toViewLeave).sort((a, b) => (a.from < b.from ? 1 : -1));

  const days: AttendanceDay[] = [];
  for (const d of history.days) {
    if (days.length >= 30) break;
    if (d.status === null || d.status === "Weekend") continue;
    let status: AttendanceHistoryDayStatus = d.status;
    if (d.status === "Present" && d.record?.workMode === "Work From Home") status = "WFH";
    days.push({ date: d.date, status });
  }

  const count = (s: AttendanceHistoryDayStatus) => days.filter((d) => d.status === s).length;
  const pending = leaves.filter((l) => l.status === "Pending");
  return {
    leaves,
    days,
    summary: {
      present: count("Present") + count("Half Day"),
      late: count("Late"),
      wfh: count("WFH"),
      absent: count("Absent"),
      onLeave: count("On Leave"),
      leaveTaken: leaves.filter((l) => l.status === "Approved").reduce((s, l) => s + l.days, 0),
      leavePending: pending.length,
      leavePendingDays: pending.reduce((s, l) => s + l.days, 0),
      leaveRejected: leaves.filter((l) => l.status === "Rejected").length,
    },
  };
}
