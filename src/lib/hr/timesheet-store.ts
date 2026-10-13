import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { TimesheetEntry } from "@/types/timesheet";
import { getTasksForEmployee } from "@/lib/hr/work-store";

// File-backed JSON store, same convention as `work-store.ts`/`leave-store.ts`.

const DATA_DIR = path.join(process.cwd(), ".data");
const TIMESHEETS_PATH = path.join(DATA_DIR, "timesheets.json");

function daysFromNow(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

const SEED_ENTRIES: TimesheetEntry[] = [
  {
    id: "ts-1",
    employeeId: "emp-1024",
    date: daysFromNow(-1),
    hours: 5,
    description: "Wired up the date-range filter for the CSV export endpoint.",
    taskId: "task-1",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "ts-2",
    employeeId: "emp-1024",
    date: daysFromNow(-1),
    hours: 2,
    description: "Sprint planning and stand-up.",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "ts-3",
    employeeId: "emp-1032",
    date: daysFromNow(-1),
    hours: 6,
    description: "Reviewed PRs for Sprint 12 and merged to main.",
    taskId: "task-4",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
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

export async function getAllTimesheetEntries(): Promise<TimesheetEntry[]> {
  return readJson(TIMESHEETS_PATH, SEED_ENTRIES);
}

export interface TimesheetEntryFilter {
  from?: string;
  to?: string;
  employeeIds?: string[];
}

export async function getTimesheetEntries(filter: TimesheetEntryFilter = {}): Promise<TimesheetEntry[]> {
  const list = await getAllTimesheetEntries();
  return list.filter((e) => {
    if (filter.from && e.date < filter.from) return false;
    if (filter.to && e.date > filter.to) return false;
    if (filter.employeeIds && !filter.employeeIds.includes(e.employeeId)) return false;
    return true;
  });
}

export interface NewTimesheetEntryInput {
  employeeId: string;
  date: string;
  hours: number;
  description: string;
  taskId?: string;
}

const MAX_HOURS_PER_DAY = 24;
const MIN_HOURS = 0.25;

export async function addTimesheetEntry(
  input: NewTimesheetEntryInput,
): Promise<TimesheetEntry | "invalid-hours" | "invalid-task" | "day-exceeded"> {
  if (input.hours < MIN_HOURS || input.hours > MAX_HOURS_PER_DAY) return "invalid-hours";

  if (input.taskId) {
    const myTasks = await getTasksForEmployee(input.employeeId);
    if (!myTasks.some((t) => t.id === input.taskId)) return "invalid-task";
  }

  const list = await getAllTimesheetEntries();
  const sameDayTotal = list
    .filter((e) => e.employeeId === input.employeeId && e.date === input.date)
    .reduce((sum, e) => sum + e.hours, 0);
  if (sameDayTotal + input.hours > MAX_HOURS_PER_DAY) return "day-exceeded";

  const now = new Date().toISOString();
  const entry: TimesheetEntry = {
    id: newId("ts"),
    employeeId: input.employeeId,
    date: input.date,
    hours: input.hours,
    description: input.description,
    taskId: input.taskId,
    createdAt: now,
    updatedAt: now,
  };
  await writeJson(TIMESHEETS_PATH, [entry, ...list]);
  return entry;
}

export interface TimesheetEntryPatch {
  hours?: number;
  description?: string;
  taskId?: string | null;
}

// Owner-only, same "forbidden" convention as `updateTaskSummary`.
export async function patchTimesheetEntry(
  id: string,
  employeeId: string,
  patch: TimesheetEntryPatch,
): Promise<TimesheetEntry | null | "forbidden" | "invalid-hours"> {
  const list = await getAllTimesheetEntries();
  const index = list.findIndex((e) => e.id === id);
  if (index === -1) return null;
  if (list[index].employeeId !== employeeId) return "forbidden";
  if (patch.hours !== undefined && (patch.hours < MIN_HOURS || patch.hours > MAX_HOURS_PER_DAY)) return "invalid-hours";

  const updated: TimesheetEntry = {
    ...list[index],
    ...(patch.hours !== undefined ? { hours: patch.hours } : {}),
    ...(patch.description !== undefined ? { description: patch.description } : {}),
    ...(patch.taskId !== undefined ? { taskId: patch.taskId ?? undefined } : {}),
    updatedAt: new Date().toISOString(),
  };
  list[index] = updated;
  await writeJson(TIMESHEETS_PATH, list);
  return updated;
}

export async function deleteTimesheetEntry(id: string, employeeId: string): Promise<true | null | "forbidden"> {
  const list = await getAllTimesheetEntries();
  const index = list.findIndex((e) => e.id === id);
  if (index === -1) return null;
  if (list[index].employeeId !== employeeId) return "forbidden";
  list.splice(index, 1);
  await writeJson(TIMESHEETS_PATH, list);
  return true;
}
