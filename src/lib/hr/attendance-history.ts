import type { AttendanceDay, AttendanceDayStatus, AttendanceHistory, LeaveCategory, LeaveRequest } from "@/types/attendance";

// Attendance and leave history for an employee profile. There's no leave or
// attendance store yet, so this is deterministic demo data: the same employee
// always gets the same history for a given day. Replace with real records
// once the leave and attendance workflows exist.

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

function countWorkingDays(from: Date, to: Date): number {
  let n = 0;
  for (let d = new Date(from); d <= to; d = addDays(d, 1)) if (!isWeekend(d)) n++;
  return n;
}

const CATEGORIES: LeaveCategory[] = ["Casual", "Sick", "Compensatory", "Mandatory", "Birthday", "Work Anniversary"];

function leavesFor(employeeId: string, today: Date): LeaveRequest[] {
  const h = hash(employeeId);
  const count = 2 + (h % 3); // 2-4 requests
  const leaves: LeaveRequest[] = [];
  for (let i = 0; i < count; i++) {
    const seed = hash(`${employeeId}-leave-${i}`);
    const offset = (seed % 120) - 80; // roughly 80 days back to 40 ahead
    const from = addDays(today, offset);
    const length = 1 + (seed % 3);
    const to = addDays(from, length - 1);
    const status = (["Pending", "Approved", "Approved", "Rejected"] as const)[seed % 4];
    leaves.push({
      id: `${employeeId}-leave-${i}`,
      category: CATEGORIES[seed % CATEGORIES.length],
      from: isoDay(from),
      to: isoDay(to),
      days: countWorkingDays(from, to),
      status,
      appliedOn: isoDay(addDays(from, -(3 + (seed % 10)))),
    });
  }
  return leaves.sort((a, b) => (a.from < b.from ? 1 : -1));
}

export function getAttendanceHistory(employeeId: string, today: Date = new Date()): AttendanceHistory {
  const leaves = leavesFor(employeeId, today);
  const approvedDates = new Set<string>();
  for (const l of leaves) {
    if (l.status !== "Approved") continue;
    for (let d = new Date(l.from); isoDay(d) <= l.to; d = addDays(d, 1)) approvedDates.add(isoDay(d));
  }

  const days: AttendanceDay[] = [];
  for (let back = 0; days.length < 30 && back < 60; back++) {
    const d = addDays(today, -back);
    if (isWeekend(d)) continue;
    const key = isoDay(d);
    let status: AttendanceDayStatus;
    if (approvedDates.has(key)) status = "On Leave";
    else {
      const r = hash(`${employeeId}-${key}`) % 100;
      status = r < 80 ? "Present" : r < 88 ? "WFH" : r < 95 ? "Late" : "Absent";
    }
    days.push({ date: key, status });
  }

  const count = (s: AttendanceDayStatus) => days.filter((d) => d.status === s).length;
  const pending = leaves.filter((l) => l.status === "Pending");
  return {
    leaves,
    days,
    summary: {
      present: count("Present"),
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

// Every date an employee is on approved leave, as of `today`. Shared with the
// daily attendance view so a leave day shows as On Leave everywhere.
export function approvedLeaveDays(employeeId: string, today: Date = new Date()): Set<string> {
  const out = new Set<string>();
  for (const l of leavesFor(employeeId, today)) {
    if (l.status !== "Approved") continue;
    for (let d = new Date(l.from); isoDay(d) <= l.to; d = addDays(d, 1)) out.add(isoDay(d));
  }
  return out;
}
