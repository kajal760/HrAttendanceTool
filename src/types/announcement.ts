// Announcements - Manager/Super Admin (and, for the demo, HR posting under
// its own "role") can publish company/department/team/individual notices
// that employees receive, read, and optionally must acknowledge.

export type AnnouncementType =
  | "General"
  | "HR"
  | "Holiday"
  | "Attendance"
  | "Policy"
  | "Training"
  | "Event"
  | "Urgent";

export const ANNOUNCEMENT_TYPES: AnnouncementType[] = [
  "General",
  "HR",
  "Holiday",
  "Attendance",
  "Policy",
  "Training",
  "Event",
  "Urgent",
];

export type AnnouncementPriority = "Normal" | "Important" | "Urgent";

export const ANNOUNCEMENT_PRIORITIES: AnnouncementPriority[] = ["Normal", "Important", "Urgent"];

// There's no real auth/session system in this app (see the rest of the
// codebase's "Super Admin" placeholder convention), so whoever creates an
// announcement picks which of these they're posting as - that's what makes
// "HR announcements are visible to Super Admin" demonstrable at all without
// a real multi-role login.
export type AnnouncementCreatorRole = "HR" | "Manager" | "Super Admin";

export const ANNOUNCEMENT_CREATOR_ROLES: AnnouncementCreatorRole[] = ["HR", "Manager", "Super Admin"];

export type AnnouncementAudienceType =
  | "Everyone"
  | "Department"
  | "Team"
  | "Employees"
  | "Managers"
  | "HR";

export const ANNOUNCEMENT_AUDIENCE_TYPES: AnnouncementAudienceType[] = [
  "Everyone",
  "Department",
  "Team",
  "Employees",
  "Managers",
  "HR",
];

export interface AnnouncementAudience {
  type: AnnouncementAudienceType;
  department?: string; // type === "Department"
  managerId?: string; // type === "Team" - everyone reporting to this manager (+ the manager)
  employeeIds?: string[]; // type === "Employees"
  // "Managers" = everyone who appears as someone else's manager; "HR" =
  // everyone in the Human Resources department. Neither needs extra fields.
}

// Draft and Archived are the only states someone sets directly; Scheduled /
// Published / Expired are derived from `publishAt`/`expiresAt` vs. now (see
// `src/lib/announcements/status.ts`) - the same "don't need a timer to flip
// a stored field" approach used for task Overdue status.
export type AnnouncementLifecycle = "Draft" | "Live" | "Archived";

export type AnnouncementStatus = "Draft" | "Scheduled" | "Published" | "Expired" | "Archived";

export interface AnnouncementAttachment {
  id: string;
  name: string;
  url: string;
  sizeBytes: number;
  contentType: string;
}

export interface AnnouncementReadReceipt {
  employeeId: string;
  readAt: string; // ISO
}

export interface AnnouncementAcknowledgement {
  employeeId: string;
  acknowledgedAt: string; // ISO
}

export type AnnouncementHistoryEventType = "Created" | "Edited" | "Published" | "Scheduled" | "Archived";

export interface AnnouncementHistoryEvent {
  id: string;
  timestamp: string; // ISO
  type: AnnouncementHistoryEventType;
  performedBy: string;
  detail?: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  type: AnnouncementType;
  priority: AnnouncementPriority;
  audience: AnnouncementAudience;
  lifecycle: AnnouncementLifecycle;
  requireAcknowledgement: boolean;
  publishAt: string; // ISO
  expiresAt?: string; // ISO
  attachments: AnnouncementAttachment[];
  createdByName: string;
  createdByRole: AnnouncementCreatorRole;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  reads: AnnouncementReadReceipt[];
  acknowledgements: AnnouncementAcknowledgement[];
  history: AnnouncementHistoryEvent[];
}
