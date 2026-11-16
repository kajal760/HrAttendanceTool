import type { NewLeaveRequestInput } from "@/lib/hr/leave-store";

const DATE = /^\d{4}-\d{2}-\d{2}$/;

// Shape-checks the apply form's body; the leave policy itself is enforced by the backend.
export function parseLeaveInput(body: unknown): NewLeaveRequestInput | { error: string } {
  const { leaveTypeId, startDate, endDate, halfDaySession, expectedDeliveryDate, reason } = (body ?? {}) as Record<
    string,
    unknown
  >;
  if (typeof leaveTypeId !== "string" || !leaveTypeId) return { error: "Choose a leave type." };
  if (typeof startDate !== "string" || !DATE.test(startDate) || typeof endDate !== "string" || !DATE.test(endDate)) {
    return { error: "Choose a valid date range." };
  }
  if (endDate < startDate) return { error: "End date must be on or after the start date." };
  if (halfDaySession !== undefined && halfDaySession !== "First Half" && halfDaySession !== "Second Half") {
    return { error: "Invalid half-day option." };
  }
  if (expectedDeliveryDate !== undefined && (typeof expectedDeliveryDate !== "string" || !DATE.test(expectedDeliveryDate))) {
    return { error: "Enter a valid expected delivery date." };
  }
  return {
    leaveTypeId,
    startDate,
    endDate,
    halfDaySession,
    expectedDeliveryDate,
    reason: typeof reason === "string" ? reason.trim() : "",
  };
}
