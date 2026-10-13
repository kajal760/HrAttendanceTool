// Single source of truth for the Lifecycle module's status-badge colors:
// green = Completed, amber = Pending, blue = In Progress,
// red = Exit/critical, gray = Not Started. Each tab maps its own status
// vocabulary onto one of these five tones rather than inventing new colors.
import type { ConfirmationStatus, EmployeeStatus, ExitChecklistItemStatus } from "@/types/hr";

export type BadgeTone = "green" | "amber" | "blue" | "red" | "gray";

export const EMPLOYEE_STATUS_TONE: Record<EmployeeStatus, BadgeTone> = {
  Onboarding: "gray",
  Probation: "blue",
  Active: "green",
  "On Leave": "amber",
  "Notice Period": "red",
  Resigned: "red",
  Exited: "red",
};

export const CONFIRMATION_STATUS_TONE: Record<ConfirmationStatus, BadgeTone> = {
  Probation: "gray",
  "Confirmation Due": "amber",
  Confirmed: "green",
  Extended: "amber",
};

export const EXIT_ITEM_STATUS_TONE: Record<ExitChecklistItemStatus, BadgeTone> = {
  Pending: "amber",
  "In Progress": "blue",
  Completed: "green",
};

export function toneClass(styles: Record<string, string>, tone: BadgeTone): string {
  const map: Record<BadgeTone, string> = {
    green: styles.badgeGreen,
    amber: styles.badgeAmber,
    blue: styles.badgeBlue,
    red: styles.badgeRed,
    gray: styles.badgeGray,
  };
  return `${styles.badge} ${map[tone]}`;
}
