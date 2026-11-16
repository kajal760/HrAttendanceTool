import { backend, BackendError } from "@/lib/api/backend";
import type { ApiTimesheetEntry } from "@/lib/api/types";
import type { TimesheetEntry } from "@/types/timesheet";

// Backed by the FastAPI `/timesheets` (Admin/HR, every employee) and
// `/timesheets/me` (the signed-in employee's own, or their department's read-only) endpoints.

function toEntry(e: ApiTimesheetEntry): TimesheetEntry {
  return {
    id: e.id,
    employeeId: e.employeeId,
    date: e.date,
    hours: e.hours,
    description: e.description,
    taskId: e.taskId ?? undefined,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
  };
}

export async function getAllTimesheetEntries(): Promise<TimesheetEntry[]> {
  return (await backend<ApiTimesheetEntry[]>("/timesheets")).map(toEntry);
}

export interface TimesheetEntryFilter {
  from?: string;
  to?: string;
}

// Admin/HR view across every employee, optionally date-ranged.
export async function getTimesheetEntries(filter: TimesheetEntryFilter = {}): Promise<TimesheetEntry[]> {
  return (
    await backend<ApiTimesheetEntry[]>("/timesheets", { query: { from: filter.from, to: filter.to } })
  ).map(toEntry);
}

// The signed-in employee's own entries (`scope: "mine"`, the default), or a
// read-only view of everyone in their own department (`scope: "department"`).
export async function getMyTimesheetEntries(
  filter: TimesheetEntryFilter & { scope?: "mine" | "department" } = {},
): Promise<TimesheetEntry[]> {
  return (
    await backend<ApiTimesheetEntry[]>("/timesheets/me", {
      query: { scope: filter.scope, from: filter.from, to: filter.to },
    })
  ).map(toEntry);
}

export interface NewTimesheetEntryInput {
  date: string;
  hours: number;
  description: string;
  taskId?: string;
}

export async function addTimesheetEntry(input: NewTimesheetEntryInput): Promise<TimesheetEntry> {
  return toEntry(
    await backend<ApiTimesheetEntry>("/timesheets/me", {
      method: "POST",
      body: { date: input.date, hours: input.hours, description: input.description, taskId: input.taskId },
    }),
  );
}

export interface TimesheetEntryPatch {
  hours?: number;
  description?: string;
  taskId?: string | null;
}

// Owner-only - the backend 403s (surfaced as BackendError) for anyone else.
export async function patchTimesheetEntry(
  id: string,
  patch: TimesheetEntryPatch,
): Promise<TimesheetEntry | null | "forbidden"> {
  try {
    return toEntry(await backend<ApiTimesheetEntry>(`/timesheets/me/${id}`, { method: "PATCH", body: patch }));
  } catch (err) {
    if (err instanceof BackendError && err.status === 404) return null;
    if (err instanceof BackendError && err.status === 403) return "forbidden";
    throw err;
  }
}

export async function deleteTimesheetEntry(id: string): Promise<true | null | "forbidden"> {
  try {
    await backend(`/timesheets/me/${id}`, { method: "DELETE" });
    return true;
  } catch (err) {
    if (err instanceof BackendError && err.status === 404) return null;
    if (err instanceof BackendError && err.status === 403) return "forbidden";
    throw err;
  }
}
