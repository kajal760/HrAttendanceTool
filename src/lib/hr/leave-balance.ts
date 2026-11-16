// Leave balances are computed by the backend (see `getLeaveSummary` /
// `getAllLeaveTotals` in `leave-store.ts`). This module only holds the
// client-safe display threshold.

// Usage % at or above this is treated as "almost used up" - the employee
// Leave Balance page pops an alert at this threshold, and the HR Leave
// Balance table counts employees past it.
export const LEAVE_WARNING_THRESHOLD = 80;
