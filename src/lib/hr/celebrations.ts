import { getEmployeeOverviews } from "@/lib/hr/employee-store";
import type { EmployeeOverview } from "@/types/hr";

// One combined feed for the Celebrations tab - birthdays, work anniversaries,
// and new joiners, all derived from the same employee directory rather than
// three separate reads. Mirrors the date math `lib/hr/anniversaries.ts` and
// `lib/employee/dashboard-data.ts` already use for birthdays/anniversaries
// individually, extended with designation/photo (which those narrower,
// dashboard-widget-oriented helpers don't carry) and a "joined recently" case.

export type CelebrationKind = "Birthday" | "Work Anniversary" | "New Joiner";

export interface CelebrationEntry {
  id: string;
  kind: CelebrationKind;
  employeeId: string;
  name: string;
  designation: string;
  department: string;
  photoUrl?: string;
  email: string;
  daysUntil: number; // 0 = today; negative = a New Joiner's days since joining
  isToday: boolean;
  dateLabel: string; // "Today", a weekday name, or "12 Dec"
  detail?: string; // "5 years" for an anniversary
}

function isActive(e: EmployeeOverview): boolean {
  return !e.deactivated && !e.exit?.deletedOn && e.status !== "Exited";
}

function dateLabel(daysUntil: number, isToday: boolean, date: Date): string {
  if (isToday) return "Today";
  if (daysUntil > 0 && daysUntil <= 6) return date.toLocaleDateString(undefined, { weekday: "long" });
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

function nextOccurrenceFromMonthDay(monthDay: string, today: Date): { daysUntil: number; isToday: boolean; date: Date } {
  const [mm, dd] = monthDay.split("-").map(Number);
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  let candidate = new Date(todayMidnight.getFullYear(), mm - 1, dd);
  if (candidate < todayMidnight) candidate = new Date(todayMidnight.getFullYear() + 1, mm - 1, dd);
  const daysUntil = Math.round((candidate.getTime() - todayMidnight.getTime()) / 86_400_000);
  return { daysUntil, isToday: daysUntil === 0, date: candidate };
}

function nextOccurrenceFromDate(dateStr: string, today: Date): { daysUntil: number; isToday: boolean; years: number; date: Date } {
  const d = new Date(dateStr);
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  let candidate = new Date(todayMidnight.getFullYear(), d.getMonth(), d.getDate());
  let years = todayMidnight.getFullYear() - d.getFullYear();
  if (candidate < todayMidnight) {
    candidate = new Date(todayMidnight.getFullYear() + 1, d.getMonth(), d.getDate());
    years += 1;
  }
  const daysUntil = Math.round((candidate.getTime() - todayMidnight.getTime()) / 86_400_000);
  return { daysUntil, isToday: daysUntil === 0, years, date: candidate };
}

const NEW_JOINER_WINDOW_DAYS = 30;

export async function getCelebrations(windowDays = 60): Promise<CelebrationEntry[]> {
  const employees = await getEmployeeOverviews();
  const today = new Date();
  const entries: CelebrationEntry[] = [];

  for (const e of employees) {
    if (!isActive(e)) continue;

    if (e.dateOfBirth) {
      const monthDay = e.dateOfBirth.slice(5);
      const { daysUntil, isToday, date } = nextOccurrenceFromMonthDay(monthDay, today);
      if (daysUntil <= windowDays) {
        entries.push({
          id: `birthday-${e.id}`,
          kind: "Birthday",
          employeeId: e.id,
          name: e.name,
          designation: e.designation,
          department: e.department,
          photoUrl: e.photoUrl,
          email: e.email,
          daysUntil,
          isToday,
          dateLabel: dateLabel(daysUntil, isToday, date),
        });
      }
    }

    const { daysUntil: annDays, isToday: annToday, years, date: annDate } = nextOccurrenceFromDate(e.joinedOn, today);
    // A "0th anniversary" (joined this calendar year) isn't a celebration yet.
    if (years >= 1 && annDays <= windowDays) {
      entries.push({
        id: `anniversary-${e.id}`,
        kind: "Work Anniversary",
        employeeId: e.id,
        name: e.name,
        designation: e.designation,
        department: e.department,
        photoUrl: e.photoUrl,
        email: e.email,
        daysUntil: annDays,
        isToday: annToday,
        dateLabel: dateLabel(annDays, annToday, annDate),
        detail: `${years} year${years === 1 ? "" : "s"}`,
      });
    }

    const daysSinceJoined = Math.round((today.getTime() - new Date(e.joinedOn).getTime()) / 86_400_000);
    if (daysSinceJoined >= 0 && daysSinceJoined <= NEW_JOINER_WINDOW_DAYS) {
      entries.push({
        id: `new-joiner-${e.id}`,
        kind: "New Joiner",
        employeeId: e.id,
        name: e.name,
        designation: e.designation,
        department: e.department,
        photoUrl: e.photoUrl,
        email: e.email,
        daysUntil: -daysSinceJoined,
        isToday: daysSinceJoined === 0,
        dateLabel: daysSinceJoined === 0 ? "Today" : `${daysSinceJoined} day${daysSinceJoined === 1 ? "" : "s"} ago`,
        detail: "Joined",
      });
    }
  }

  return entries.sort((a, b) => a.daysUntil - b.daysUntil);
}
