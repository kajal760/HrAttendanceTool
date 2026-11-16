import { backend } from "@/lib/api/backend";
import type { ApiAttendanceStatus, ApiRosterRow } from "@/lib/api/types";
import { addDays, isoDay } from "@/lib/hr/attendance-history";

// Daily attendance for the Attendance module - real clock-in/out records
// from the backend roster (`/attendance/daily`, `/attendance/range`), with
// approved leave and holidays already resolved there. Times are shown in
// the company timezone.

export const COMPANY_TIMEZONE = "Asia/Kolkata";
export const EXPECTED_CHECKIN_MIN = 9 * 60 + 30; // 09:30 - the backend adds its grace period before marking Late

export type DailyStatus = "Present" | "Late" | "Half Day" | "Absent" | "On Leave" | "Holiday" | "Not checked in";
export type WorkMode = "Office" | "WFH";
// The backend reverse-geocodes the clock-in coordinates and returns a place
// name in `record.location`. "Not verified" covers the rare case where a
// location was captured but geocoding failed and returned nothing; the
// geofence check ("Verified"/"Outside office range") isn't implemented yet.
export type LocationStatus = "Not verified" | "Not applicable";

export interface DailyRecord {
  employeeId: string;
  employeeCode: string;
  name: string;
  department: string;
  date: string;
  status: DailyStatus;
  workMode: WorkMode | null;
  expectedCheckIn: string;
  checkIn: string | null; // HH:MM
  checkOut: string | null; // HH:MM, null while still working
  checkInMin: number | null;
  delayMin: number; // minutes after the expected check-in, 0 if on time
  breakMin: number;
  workingMin: number | null;
  location: LocationStatus | string;
}

export function fmtTime(min: number | null): string | null {
  if (min === null) return null;
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}

export { fmtDuration } from "@/lib/hr/attendance-format";

const clockFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: COMPANY_TIMEZONE,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function minutesOfDay(iso: string): number {
  const [h, m] = clockFormat.format(new Date(iso)).split(":").map(Number);
  return h * 60 + m;
}

function toStatus(status: ApiAttendanceStatus | null): DailyStatus {
  // null = today/future with no clock-in yet. Weekend rows are dropped before this.
  if (status === null || status === "Weekend") return "Not checked in";
  return status;
}

function toDailyRecord(row: ApiRosterRow): DailyRecord {
  const r = row.record;
  const checkInMin = r ? minutesOfDay(r.clockIn) : null;
  return {
    employeeId: row.employeeId,
    employeeCode: row.employeeCode,
    name: row.name,
    department: row.department ?? "",
    date: row.date,
    status: toStatus(row.status),
    workMode: r ? (r.workMode === "Work From Home" ? "WFH" : "Office") : null,
    expectedCheckIn: fmtTime(EXPECTED_CHECKIN_MIN) ?? "09:30",
    checkIn: fmtTime(checkInMin),
    checkOut: r?.clockOut ? fmtTime(minutesOfDay(r.clockOut)) : null,
    checkInMin,
    delayMin: checkInMin === null ? 0 : Math.max(0, checkInMin - EXPECTED_CHECKIN_MIN),
    breakMin: r?.breakMinutes ?? 0,
    workingMin: r?.clockOut ? Math.round(r.netHours * 60) : null,
    location: !r ? "Not applicable" : r.location ?? "Not verified",
  };
}

function byDateThenName(a: DailyRecord, b: DailyRecord): number {
  return a.date === b.date ? a.name.localeCompare(b.name) : a.date < b.date ? -1 : 1;
}

// Every active employee's record for one date. Returns [] on weekends.
export async function getDailyRecords(date: string): Promise<DailyRecord[]> {
  const rows = await backend<ApiRosterRow[]>("/attendance/daily", { query: { date } }).then((r) =>
    r.filter((row) => row.status !== "Weekend"),
  );
  return rows.map(toDailyRecord).sort(byDateThenName);
}

// Records for every working day in [from, to] - one per active employee per day.
export async function getRangeRecords(from: string, to: string): Promise<DailyRecord[]> {
  const rows = await backend<ApiRosterRow[]>("/attendance/range", { query: { from, to } }).then((r) =>
    r.filter((row) => row.status !== "Weekend"),
  );
  return rows.map(toDailyRecord).sort(byDateThenName);
}

export function todayIso(now: Date = new Date()): string {
  return now.toLocaleDateString("en-CA", { timeZone: COMPANY_TIMEZONE });
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// Accepts ?date=YYYY-MM-DD; anything else falls back to today.
export function resolveDate(raw: string | undefined, now: Date = new Date()): string {
  return raw && ISO_DATE.test(raw) ? raw : todayIso(now);
}

export type PeriodMode = "day" | "week" | "month" | "quarter" | "six" | "custom";
export const PERIOD_MODES: PeriodMode[] = ["day", "week", "month", "quarter", "six", "custom"];

export interface Period {
  mode: PeriodMode;
  anchor: string; // YYYY-MM-DD the period is built around
  from: string;
  to: string;
}

function parseIso(s: string): Date {
  return new Date(`${s}T00:00:00`);
}

// Turns ?period=&date=&from=&to= into a concrete date range. Week is the
// Monday-Sunday containing the anchor; month/quarter are calendar periods;
// six months ends with the anchor month; custom uses from/to as given.
export function resolvePeriod(
  params: { period?: string; date?: string; from?: string; to?: string },
  now: Date = new Date(),
): Period {
  const anchor = resolveDate(params.date, now);
  const a = parseIso(anchor);
  const mode = (PERIOD_MODES as string[]).includes(params.period ?? "") ? (params.period as PeriodMode) : "day";
  const lastOf = (y: number, m: number) => isoDay(new Date(y, m + 1, 0));
  const y = a.getFullYear();
  const m = a.getMonth();

  if (mode === "week") {
    const dow = (a.getDay() + 6) % 7; // Monday = 0
    const start = addDays(a, -dow);
    return { mode, anchor, from: isoDay(start), to: isoDay(addDays(start, 6)) };
  }
  if (mode === "month") return { mode, anchor, from: isoDay(new Date(y, m, 1)), to: lastOf(y, m) };
  if (mode === "quarter") {
    const qStart = Math.floor(m / 3) * 3;
    return { mode, anchor, from: isoDay(new Date(y, qStart, 1)), to: lastOf(y, qStart + 2) };
  }
  if (mode === "six") return { mode, anchor, from: isoDay(new Date(y, m - 5, 1)), to: lastOf(y, m) };
  if (mode === "custom") {
    const from = params.from && ISO_DATE.test(params.from) ? params.from : isoDay(addDays(a, -30));
    const to = params.to && ISO_DATE.test(params.to) ? params.to : anchor;
    return from <= to ? { mode, anchor, from, to } : { mode, anchor, from: to, to: from };
  }
  return { mode: "day", anchor, from: anchor, to: anchor };
}
