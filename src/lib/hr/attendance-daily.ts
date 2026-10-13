import type { EmployeeOverview } from "@/types/hr";
import { getEmployeeOverviews } from "@/lib/hr/employee-store";
import { addDays, approvedLeaveDays, hash, isWeekend, isoDay } from "@/lib/hr/attendance-history";

// Daily attendance for the Attendance module. Records are generated
// deterministically per employee and date until a real clock-in/out feed
// exists; approved leave (from the employee's leave history) takes priority.

export const OFFICE_START_MIN = 9 * 60; // 09:00
export const EXPECTED_CHECKIN_MIN = 9 * 60 + 30; // 09:30 - later than this is late
export const SHIFT_MIN = 8 * 60;

export type DailyStatus = "Present" | "Late" | "Absent" | "On Leave";
export type WorkMode = "Office" | "WFH";
export type LocationStatus = "Verified" | "Outside office range" | "Not verified" | "Not applicable";

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
  location: LocationStatus;
}

export function fmtTime(min: number | null): string | null {
  if (min === null) return null;
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}

export { fmtDuration } from "@/lib/hr/attendance-format";

function recordFor(e: EmployeeOverview, date: string, leaveDays: Set<string>, now: Date): DailyRecord {
  const base = {
    employeeId: e.id,
    employeeCode: e.employeeCode,
    name: e.name,
    department: e.department,
    date,
    expectedCheckIn: fmtTime(EXPECTED_CHECKIN_MIN) ?? "09:30",
  };
  if (leaveDays.has(date)) {
    return { ...base, status: "On Leave", workMode: null, checkIn: null, checkOut: null, checkInMin: null, delayMin: 0, breakMin: 0, workingMin: null, location: "Not applicable" };
  }

  const h = hash(`${e.id}-${date}`);
  const roll = h % 100;
  const status: DailyStatus = roll < 5 ? "Absent" : roll < 17 ? "Late" : "Present";
  if (status === "Absent") {
    return { ...base, status, workMode: null, checkIn: null, checkOut: null, checkInMin: null, delayMin: 0, breakMin: 0, workingMin: null, location: "Not applicable" };
  }

  const workMode: WorkMode = hash(`${e.id}-mode-${date}`) % 100 < 25 ? "WFH" : "Office";
  const checkInMin =
    status === "Late"
      ? EXPECTED_CHECKIN_MIN + 1 + (hash(`${e.id}-in-${date}`) % 45)
      : OFFICE_START_MIN + 20 + (hash(`${e.id}-in-${date}`) % 50);
  const breakMin = 30 + (hash(`${e.id}-brk-${date}`) % 45);
  const checkOutMin = checkInMin + SHIFT_MIN + (hash(`${e.id}-out-${date}`) % 90);

  // Today: still at work until the shift's end time has passed.
  const todayKey = isoDay(now);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const stillWorking = date === todayKey && nowMin < checkOutMin;

  const locRoll = hash(`${e.id}-loc-${date}`) % 100;
  const location: LocationStatus =
    workMode === "Office"
      ? locRoll < 8 ? "Outside office range" : "Verified"
      : locRoll < 10 ? "Not verified" : "Verified";

  const workingMin = stillWorking ? null : checkOutMin - checkInMin - breakMin;
  return {
    ...base,
    status,
    workMode,
    checkIn: fmtTime(checkInMin),
    checkOut: stillWorking ? null : fmtTime(checkOutMin),
    checkInMin,
    delayMin: Math.max(0, checkInMin - EXPECTED_CHECKIN_MIN),
    breakMin,
    workingMin,
    location,
  };
}

// Every active employee's record for one date. Returns [] on weekends.
export async function getDailyRecords(date: string, now: Date = new Date()): Promise<DailyRecord[]> {
  const d = new Date(`${date}T00:00:00`);
  if (Number.isNaN(d.getTime()) || isWeekend(d)) return [];
  const employees = await getEmployeeOverviews();
  return employees
    .filter((e) => !e.deactivated && e.status !== "Exited" && e.status !== "Resigned" && !e.exit?.deletedOn)
    .map((e) => recordFor(e, date, approvedLeaveDays(e.id, now), now))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function todayIso(now: Date = new Date()): string {
  return isoDay(now);
}

// Accepts ?date=YYYY-MM-DD; anything else falls back to today.
export function resolveDate(raw: string | undefined, now: Date = new Date()): string {
  return raw && /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : todayIso(now);
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
    const from = params.from && /^d{4}-d{2}-d{2}$/.test(params.from) ? params.from : isoDay(addDays(a, -30));
    const to = params.to && /^d{4}-d{2}-d{2}$/.test(params.to) ? params.to : anchor;
    return from <= to ? { mode, anchor, from, to } : { mode, anchor, from: to, to: from };
  }
  return { mode: "day", anchor, from: anchor, to: anchor };
}

// Records for every working day in [from, to] - one per active employee per day.
export async function getRangeRecords(from: string, to: string, now: Date = new Date()): Promise<DailyRecord[]> {
  const employees = (await getEmployeeOverviews()).filter(
    (e) => !e.deactivated && e.status !== "Exited" && e.status !== "Resigned" && !e.exit?.deletedOn,
  );
  const leaveByEmployee = new Map(employees.map((e) => [e.id, approvedLeaveDays(e.id, now)] as const));
  const out: DailyRecord[] = [];
  for (let d = parseIso(from); isoDay(d) <= to; d = addDays(d, 1)) {
    if (isWeekend(d)) continue;
    const key = isoDay(d);
    for (const e of employees) out.push(recordFor(e, key, leaveByEmployee.get(e.id) ?? new Set(), now));
  }
  return out.sort((a, b) => (a.date === b.date ? a.name.localeCompare(b.name) : a.date < b.date ? -1 : 1));
}
