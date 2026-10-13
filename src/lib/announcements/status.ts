import type { Announcement, AnnouncementAudience, AnnouncementStatus } from "@/types/announcement";
import type { EmployeeOverview } from "@/types/hr";

export const STATUS_FILTERS: AnnouncementStatus[] = ["Published", "Scheduled", "Draft", "Expired", "Archived"];

// Draft/Archived are stored directly; Scheduled/Published/Expired are
// derived from publishAt/expiresAt vs. now, same reasoning as task Overdue -
// no timer needed to flip a field the moment a date passes.
export function announcementStatus(announcement: Pick<Announcement, "lifecycle" | "publishAt" | "expiresAt">): AnnouncementStatus {
  if (announcement.lifecycle === "Draft") return "Draft";
  if (announcement.lifecycle === "Archived") return "Archived";
  const now = new Date();
  if (new Date(announcement.publishAt) > now) return "Scheduled";
  if (announcement.expiresAt && new Date(announcement.expiresAt) < now) return "Expired";
  return "Published";
}

// Resolves an audience definition into the actual list of employees it
// targets, live against the current directory - a department rename or a
// new hire is reflected immediately rather than needing the announcement
// re-saved.
export function resolveAudience(audience: AnnouncementAudience, employees: EmployeeOverview[]): EmployeeOverview[] {
  switch (audience.type) {
    case "Everyone":
      return employees;
    case "Department":
      return employees.filter((e) => e.department === audience.department);
    case "Team": {
      if (!audience.managerId) return [];
      return employees.filter((e) => e.id === audience.managerId || e.managerId === audience.managerId);
    }
    case "Employees": {
      const ids = new Set(audience.employeeIds ?? []);
      return employees.filter((e) => ids.has(e.id));
    }
    case "Managers": {
      const managerIds = new Set(employees.map((e) => e.managerId).filter((id): id is string => !!id));
      return employees.filter((e) => managerIds.has(e.id));
    }
    case "HR":
      return employees.filter((e) => e.department === "Human Resources");
    default:
      return [];
  }
}

export function audienceLabel(audience: AnnouncementAudience, employees: EmployeeOverview[]): string {
  switch (audience.type) {
    case "Everyone":
      return "All employees";
    case "Department":
      return audience.department ? `${audience.department} department` : "A department";
    case "Team": {
      const manager = employees.find((e) => e.id === audience.managerId);
      return manager ? `${manager.name}'s team` : "A team";
    }
    case "Employees":
      return `${audience.employeeIds?.length ?? 0} selected employee(s)`;
    case "Managers":
      return "Managers only";
    case "HR":
      return "HR only";
    default:
      return "Unknown audience";
  }
}
