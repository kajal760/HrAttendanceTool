import type { EmployeeOverview } from "@/types/hr";

// The timeline's 9 stages are a mix of persistent states (Onboarding,
// Probation, Separation, Exited) and one-off events (Transfer/Promotion,
// Role Change) - for an Active employee with no recent movement, "current
// stage" settles at Confirmation. Nothing here is fabricated: it's derived
// from fields already on the record (status, onboarding checklist
// progress, F&F settlement, and the most recent lifecycle event).
export type LifecycleStage =
  | "Joining"
  | "Onboarding"
  | "Probation"
  | "Confirmation"
  | "Transfer/Promotion"
  | "Role Change"
  | "Separation"
  | "Full & Final Settlement"
  | "Exited";

export const LIFECYCLE_STAGES: LifecycleStage[] = [
  "Joining",
  "Onboarding",
  "Probation",
  "Confirmation",
  "Transfer/Promotion",
  "Role Change",
  "Separation",
  "Full & Final Settlement",
  "Exited",
];

const RECENT_WINDOW_DAYS = 30;

function daysAgo(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24);
}

export function currentStage(e: EmployeeOverview): LifecycleStage {
  if (e.status === "Onboarding") {
    const anyDone = e.onboardingTasks.some((t) => t.done);
    return anyDone ? "Onboarding" : "Joining";
  }
  if (e.status === "Probation") return "Probation";
  if (e.status === "Notice Period") return "Separation";
  if (e.status === "Resigned" || e.status === "Exited") {
    return e.exit?.fnfSettled || e.exit?.deletedOn ? "Exited" : "Full & Final Settlement";
  }
  // Active / On Leave - settled unless something moved recently.
  const recent = e.lifecycleHistory[0];
  if (recent && daysAgo(recent.date) <= RECENT_WINDOW_DAYS) {
    if (recent.type === "Role changed") return "Role Change";
    if (recent.type === "Transferred" || recent.type === "Promoted") return "Transfer/Promotion";
  }
  return "Confirmation";
}

export function isRecentEvent(iso: string): boolean {
  return daysAgo(iso) <= RECENT_WINDOW_DAYS;
}
