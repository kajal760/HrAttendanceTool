import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { LeaveCategory, LeaveRequest, LeaveRequestStatus } from "@/types/employee";

// File-backed JSON store, same convention as `work-store.ts`: Next's dev
// server (Turbopack) runs route handlers and page components in separate
// module instances, so a plain in-memory array written by one is invisible
// to the other - reading from disk each time sidesteps that.
//
// This replaces the old employee-side `useLeaveRequests` localStorage hook:
// for HR to see and approve a request, it has to live on the server, not
// trapped in the employee's own browser.

const DATA_DIR = path.join(process.cwd(), ".data");
const LEAVE_PATH = path.join(DATA_DIR, "leave-requests.json");

const SEED_REQUESTS: LeaveRequest[] = [
  {
    id: "lv-1",
    employeeId: "emp-1024",
    employeeName: "Aditi Sharma",
    category: "Compensatory Leave",
    startDate: "2026-10-12",
    endDate: "2026-10-12",
    days: 1,
    reason: "Worked through the weekend for the release cutover.",
    status: "Pending",
    submittedAt: "2026-10-05T14:20:00.000Z",
  },
  {
    id: "lv-2",
    employeeId: "emp-1024",
    employeeName: "Aditi Sharma",
    category: "Casual Leave",
    startDate: "2026-09-18",
    endDate: "2026-09-18",
    days: 1,
    reason: "Family function.",
    status: "Approved",
    submittedAt: "2026-09-10T09:00:00.000Z",
    decidedBy: "Neha Kapoor",
    decidedAt: "2026-09-10T12:00:00.000Z",
  },
  {
    id: "lv-3",
    employeeId: "emp-1024",
    employeeName: "Aditi Sharma",
    category: "Sick Leave",
    startDate: "2026-09-05",
    endDate: "2026-09-06",
    days: 2,
    reason: "Fever, advised rest by doctor.",
    status: "Approved",
    submittedAt: "2026-09-04T08:30:00.000Z",
    decidedBy: "Neha Kapoor",
    decidedAt: "2026-09-04T10:00:00.000Z",
  },
  {
    id: "lv-4",
    employeeId: "emp-1024",
    employeeName: "Aditi Sharma",
    category: "Casual Leave",
    startDate: "2026-08-14",
    endDate: "2026-08-15",
    days: 2,
    reason: "Personal travel.",
    status: "Rejected",
    submittedAt: "2026-08-10T11:00:00.000Z",
    decidedBy: "Neha Kapoor",
    decidedAt: "2026-08-10T15:00:00.000Z",
    decisionNote: "Too close to the release freeze - please resubmit for after Oct 20.",
  },
];

async function readJson<T>(filePath: string, seed: T): Promise<T> {
  try {
    const raw = await readFile(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return seed;
  }
}

async function writeJson<T>(filePath: string, data: T): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(filePath, JSON.stringify(data, null, 2), "utf8");
}

function newId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.round(Math.random() * 1e6)}`;
}

export async function getLeaveRequests(): Promise<LeaveRequest[]> {
  return readJson(LEAVE_PATH, SEED_REQUESTS);
}

export async function getLeaveRequestsForEmployee(employeeId: string): Promise<LeaveRequest[]> {
  const list = await getLeaveRequests();
  return list.filter((r) => r.employeeId === employeeId);
}

function rangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart <= bEnd && bStart <= aEnd;
}

export interface NewLeaveRequestInput {
  employeeId: string;
  employeeName: string;
  category: LeaveCategory;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
}

// Rejects a new request that overlaps one of the employee's own
// Pending/Approved requests - a Rejected one doesn't block a resubmission.
export async function addLeaveRequest(input: NewLeaveRequestInput): Promise<LeaveRequest | "overlap"> {
  const list = await getLeaveRequests();
  const hasOverlap = list.some(
    (r) =>
      r.employeeId === input.employeeId &&
      r.status !== "Rejected" &&
      rangesOverlap(r.startDate, r.endDate, input.startDate, input.endDate),
  );
  if (hasOverlap) return "overlap";

  const request: LeaveRequest = {
    id: newId("lv"),
    employeeId: input.employeeId,
    employeeName: input.employeeName,
    category: input.category,
    startDate: input.startDate,
    endDate: input.endDate,
    days: input.days,
    reason: input.reason,
    status: "Pending",
    submittedAt: new Date().toISOString(),
  };
  await writeJson(LEAVE_PATH, [request, ...list]);
  return request;
}

// HR's approve/reject action - only works from Pending, so a request can't
// be decided twice.
export async function decideLeaveRequest(
  id: string,
  status: Exclude<LeaveRequestStatus, "Pending">,
  decidedBy: string,
  note?: string,
): Promise<LeaveRequest | null | "not-pending"> {
  const list = await getLeaveRequests();
  const index = list.findIndex((r) => r.id === id);
  if (index === -1) return null;
  if (list[index].status !== "Pending") return "not-pending";

  const updated: LeaveRequest = {
    ...list[index],
    status,
    decidedBy,
    decidedAt: new Date().toISOString(),
    decisionNote: note,
  };
  list[index] = updated;
  await writeJson(LEAVE_PATH, list);
  return updated;
}
