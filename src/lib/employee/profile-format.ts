import type { EmployeeStatus } from "@/types/hr";

export const STATUS_CLASS: Record<EmployeeStatus, string> = {
  Onboarding: "status-onboarding",
  Probation: "status-probation",
  Active: "status-active",
  "On Leave": "status-onleave",
  "Notice Period": "status-notice",
  Resigned: "status-resigned",
  Exited: "status-exited",
};

export function formatDate(iso?: string): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function formatSalary(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}/yr`;
}
