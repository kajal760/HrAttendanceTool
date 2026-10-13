import {
  LEAVE_CATEGORIES,
  type LeaveCategory,
  type LeaveRequest,
  type LeaveSummary,
  type LeaveTypeBalance,
} from "@/types/employee";

// Pure, no `node:fs` - unlike `leave-store.ts`, this is safe to import from
// client components (e.g. an HR balance table) as well as server code.

// Fixed per-category yearly allocation - not a full policy engine, just
// enough to subtract approved days against.
const ALLOCATIONS: Record<LeaveCategory, number> = {
  "Casual Leave": 12,
  "Sick Leave": 8,
  "Compensatory Leave": 4,
  "Mandatory Leave": 3,
  "Birthday Leave": 1,
  "Work Anniversary Leave": 1,
};

// The leave year runs from `leaveYearStart` (a "MM-DD" string, e.g.
// "07-01" for 1 July) through the day before it recurs next year. Resolves
// to whichever such window contains `reference` (defaults to now).
function currentLeaveYearRange(leaveYearStart: string, reference: Date = new Date()): { start: Date; end: Date } {
  const [month, day] = leaveYearStart.split("-").map(Number);
  const year = reference.getFullYear();
  let start = new Date(year, month - 1, day);
  if (start.getTime() > reference.getTime()) {
    start = new Date(year - 1, month - 1, day);
  }
  const end = new Date(start.getFullYear() + 1, start.getMonth(), start.getDate());
  return { start, end };
}

function isWithinRange(dateStr: string, start: Date, end: Date): boolean {
  const d = new Date(dateStr);
  return d.getTime() >= start.getTime() && d.getTime() < end.getTime();
}

// Balances are derived, not stored: allocated is the fixed per-category
// constant above, used is the sum of this employee's Approved days whose
// start date falls in the current leave year, remaining is the difference
// (floored at 0).
export function computeBalances(requests: LeaveRequest[], employeeId: string, leaveYearStart: string): LeaveSummary {
  const { start, end } = currentLeaveYearRange(leaveYearStart);
  const usedByCategory = new Map<LeaveCategory, number>();

  for (const r of requests) {
    if (r.employeeId !== employeeId || r.status !== "Approved") continue;
    if (!isWithinRange(r.startDate, start, end)) continue;
    usedByCategory.set(r.category, (usedByCategory.get(r.category) ?? 0) + r.days);
  }

  const byType: LeaveTypeBalance[] = LEAVE_CATEGORIES.map((category) => {
    const allocated = ALLOCATIONS[category];
    const used = usedByCategory.get(category) ?? 0;
    return { type: category, allocated, used, remaining: Math.max(0, allocated - used) };
  });

  return {
    totalAllocated: byType.reduce((sum, b) => sum + b.allocated, 0),
    totalUsed: byType.reduce((sum, b) => sum + b.used, 0),
    totalRemaining: byType.reduce((sum, b) => sum + b.remaining, 0),
    byType,
  };
}
