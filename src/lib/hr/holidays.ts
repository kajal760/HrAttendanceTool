import { backend, BackendError } from "@/lib/api/backend";
import type { ApiHoliday } from "@/lib/api/types";
import type { CompanyHoliday } from "@/types/employee";

// Company holidays from the backend (`/holidays`): bank holidays apply to
// everyone ("Public"); regional ones are restricted holidays an employee may
// pick ("Optional"). For an employee, `selected` marks the ones they chose.

function toHoliday(h: ApiHoliday): CompanyHoliday {
  return { id: h.id, name: h.name, date: h.date, type: h.type === "Bank" ? "Public" : "Optional" };
}

// This year's and next year's holidays, in date order.
export async function getCompanyHolidays(): Promise<CompanyHoliday[]> {
  const year = new Date().getFullYear();
  const [current, next] = await Promise.all([
    backend<ApiHoliday[]>("/holidays", { query: { year } }),
    backend<ApiHoliday[]>("/holidays", { query: { year: year + 1 } }),
  ]);
  return [...current, ...next].map(toHoliday).sort((a, b) => (a.date < b.date ? -1 : 1));
}

// What the signed-in employee actually gets off: every bank holiday plus the
// regional holidays they picked.
export async function getMyHolidays(): Promise<CompanyHoliday[]> {
  const year = new Date().getFullYear();
  const [current, next] = await Promise.all([
    backend<ApiHoliday[]>("/holidays", { query: { year } }),
    backend<ApiHoliday[]>("/holidays", { query: { year: year + 1 } }),
  ]);
  return [...current, ...next]
    .filter((h) => h.type === "Bank" || h.selected)
    .map(toHoliday)
    .sort((a, b) => (a.date < b.date ? -1 : 1));
}

export interface NewHolidayInput {
  name: string;
  date: string; // YYYY-MM-DD
  type: "Public" | "Optional";
}

function fromHolidayType(type: "Public" | "Optional"): "Bank" | "Regional" {
  return type === "Public" ? "Bank" : "Regional";
}

export async function addHoliday(input: NewHolidayInput): Promise<CompanyHoliday> {
  const holiday = await backend<ApiHoliday>("/holidays", {
    method: "POST",
    body: { name: input.name, date: input.date, type: fromHolidayType(input.type) },
  });
  return toHoliday(holiday);
}

export async function patchHoliday(id: string, input: NewHolidayInput): Promise<CompanyHoliday> {
  const holiday = await backend<ApiHoliday>(`/holidays/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: { name: input.name, date: input.date, type: fromHolidayType(input.type) },
  });
  return toHoliday(holiday);
}

// Throws a 409 BackendError when the holiday can't be removed (e.g. already referenced).
export async function deleteHoliday(id: string): Promise<boolean> {
  try {
    await backend(`/holidays/${encodeURIComponent(id)}`, { method: "DELETE" });
    return true;
  } catch (err) {
    if (err instanceof BackendError && (err.status === 404 || err.status === 422)) return false;
    throw err;
  }
}
