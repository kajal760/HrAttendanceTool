import { backend, BackendError } from "@/lib/api/backend";
import type { ApiAttendanceHistory, ApiAttendanceRecord, ApiTodayAttendance } from "@/lib/api/types";
import type { GeoPoint, WorkMode } from "@/types/employee";

// Clock-in/out for whoever is signed in - Employees on the Attendance page,
// HR on their dashboard card. Backed by the FastAPI `/attendance/me/*`
// endpoints, which work off the session's employee record (so a pure Admin
// login with no employee record can't clock in). One record per employee
// per day, in the company timezone.

export interface BreakEntry {
  id: string;
  startedAt: string; // ISO
  endedAt?: string; // ISO, absent while the break is running
}

export interface ClockRecord {
  id: string;
  employeeId: string;
  date: string; // YYYY-MM-DD
  clockIn?: string; // ISO
  clockOut?: string; // ISO
  workMode: WorkMode;
  breaks?: BreakEntry[];
  status: string; // Present / Late / Half Day
  netHours: number;
  breakMinutes: number;
}

export function toClockRecord(r: ApiAttendanceRecord): ClockRecord {
  return {
    id: r.id,
    employeeId: r.employeeId,
    date: r.date,
    clockIn: r.clockIn,
    clockOut: r.clockOut ?? undefined,
    workMode: r.workMode,
    breaks: r.breaks.map((b) => ({ id: b.id, startedAt: b.startedAt, endedAt: b.endedAt ?? undefined })),
    status: r.status,
    netHours: r.netHours,
    breakMinutes: r.breakMinutes,
  };
}

export function today(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

export async function getTodayRecord(): Promise<ClockRecord | null> {
  try {
    const data = await backend<ApiTodayAttendance>("/attendance/me/today");
    return data.record ? toClockRecord(data.record) : null;
  } catch (err) {
    // 403: this login has no employee record (e.g. the Super Admin account).
    if (err instanceof BackendError && err.status === 403) return null;
    throw err;
  }
}

// Most recent clocked-in days, newest first - backs the "View history"
// panel on the admin/HR dashboard's own attendance card.
export async function getRecordHistory(limit = 14): Promise<ClockRecord[]> {
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - Math.max(limit * 2, 31));
  try {
    const history = await backend<ApiAttendanceHistory>("/attendance/me/history", {
      query: { from: from.toLocaleDateString("en-CA"), to: to.toLocaleDateString("en-CA") },
    });
    return history.days
      .filter((d) => d.record)
      .slice(0, limit)
      .map((d) => toClockRecord(d.record!));
  } catch (err) {
    if (err instanceof BackendError && err.status === 403) return [];
    throw err;
  }
}

export type ClockResult = { record: ClockRecord } | { error: string };

async function act(path: string, body?: unknown): Promise<ClockResult> {
  try {
    return { record: toClockRecord(await backend<ApiAttendanceRecord>(path, { method: "POST", body })) };
  } catch (err) {
    if (err instanceof BackendError && err.status < 500) return { error: err.detail };
    throw err;
  }
}

export function clockIn(workMode: WorkMode = "Office", location?: GeoPoint): Promise<ClockResult> {
  return act("/attendance/me/clock-in", {
    workMode,
    latitude: location?.lat ?? null,
    longitude: location?.lng ?? null,
  });
}

export function clockOut(): Promise<ClockResult> {
  return act("/attendance/me/clock-out");
}

export function startBreak(): Promise<ClockResult> {
  return act("/attendance/me/breaks/start");
}

export function endBreak(): Promise<ClockResult> {
  return act("/attendance/me/breaks/end");
}
