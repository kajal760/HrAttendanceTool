import { getEmployeeOverviews } from "@/lib/hr/employee-store";
import type { EmployeeOverview } from "@/types/hr";

export interface UpcomingAnniversary {
  id: string;
  name: string;
  initials: string;
  email: string;
  department: string;
  years: number;
  daysUntil: number;
  isToday: boolean;
}

// Mirrors `nextOccurrence` in `src/lib/employee/mock-data.ts` (used for
// birthdays), but works from a full `joinedOn` date rather than a bare
// "MM-DD" string, so it can also report how many years this anniversary
// marks.
function nextOccurrence(joinedOn: string, today: Date): { daysUntil: number; isToday: boolean; years: number } {
  const joined = new Date(joinedOn);
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  let candidate = new Date(todayMidnight.getFullYear(), joined.getMonth(), joined.getDate());
  let years = todayMidnight.getFullYear() - joined.getFullYear();
  if (candidate < todayMidnight) {
    candidate = new Date(todayMidnight.getFullYear() + 1, joined.getMonth(), joined.getDate());
    years += 1;
  }
  const daysUntil = Math.round((candidate.getTime() - todayMidnight.getTime()) / (24 * 60 * 60 * 1000));
  return { daysUntil, isToday: daysUntil === 0, years };
}

function isActive(e: EmployeeOverview): boolean {
  return !e.deactivated && !e.exit?.deletedOn && e.status !== "Exited";
}

export async function getUpcomingAnniversaries(limit = 5, windowDays = 60): Promise<UpcomingAnniversary[]> {
  const employees = await getEmployeeOverviews();
  const today = new Date();
  return employees
    .filter(isActive)
    .map((e) => ({ e, ...nextOccurrence(e.joinedOn, today) }))
    // A "0th anniversary" (joined today, this calendar year) isn't a
    // celebration yet - only count once at least one full year has passed.
    .filter(({ years }) => years >= 1)
    .map(({ e, daysUntil, isToday, years }) => ({
      id: e.id,
      name: e.name,
      initials: e.initials,
      email: e.email,
      department: e.department,
      years,
      daysUntil,
      isToday,
    }))
    .filter((a) => a.daysUntil <= windowDays)
    .sort((a, b) => a.daysUntil - b.daysUntil)
    .slice(0, limit);
}

export async function getTodaysAnniversaries(): Promise<UpcomingAnniversary[]> {
  const anniversaries = await getUpcomingAnniversaries(50, 0);
  return anniversaries.filter((a) => a.isToday);
}
