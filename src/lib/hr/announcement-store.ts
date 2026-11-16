import { backend, backendRaw, BackendError } from "@/lib/api/backend";
import type { ApiAnnouncement } from "@/lib/api/types";
import type {
  Announcement,
  AnnouncementAudience,
  AnnouncementCreatorRole,
  AnnouncementLifecycle,
  AnnouncementPriority,
  AnnouncementType,
} from "@/types/announcement";

// Backed by the FastAPI `/announcements` endpoints. `GET /announcements` and
// `GET /announcements/{id}` branch server-side on the caller's role: Admin/HR
// get every announcement (incl. Draft/Archived), an Employee gets only the
// Live ones whose audience actually targets them - so this store needs no
// separate "my announcements" variant, every existing call site (admin list/
// detail pages, the employee feed, the nav unread badge, search, logs)
// already gets the right slice for whoever's signed in.

function toAnnouncement(a: ApiAnnouncement): Announcement {
  return {
    id: a.id,
    title: a.title,
    content: a.content,
    type: a.type as AnnouncementType,
    priority: a.priority as AnnouncementPriority,
    audience: {
      type: a.audience.type,
      department: a.audience.department ?? undefined,
      managerId: a.audience.managerId ?? undefined,
      employeeIds: a.audience.employeeIds ?? undefined,
    },
    lifecycle: a.lifecycle as AnnouncementLifecycle,
    publishAt: a.publishAt,
    expiresAt: a.expiresAt ?? undefined,
    attachments: a.attachments.map((att) => ({
      id: att.id,
      name: att.name,
      url: `/api/announcements/${a.id}/attachments/${att.id}`,
      sizeBytes: att.sizeBytes,
      contentType: att.contentType,
    })),
    createdByName: a.createdByName,
    // No backend "Manager" login role exists (Admin/HR/Employee only), so this
    // is "Super Admin" or "HR" in practice - see AnnouncementCreatorRole.
    createdByRole: (a.createdByRole ?? "Super Admin") as AnnouncementCreatorRole,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
    reads: a.reads,
    history: a.history.map((h) => ({ id: h.id, timestamp: h.timestamp, type: h.type, performedBy: h.performedBy })),
  };
}

export async function getAnnouncements(): Promise<Announcement[]> {
  return (await backend<ApiAnnouncement[]>("/announcements")).map(toAnnouncement);
}

export async function getAnnouncement(id: string): Promise<Announcement | null> {
  try {
    return toAnnouncement(await backend<ApiAnnouncement>(`/announcements/${id}`));
  } catch (err) {
    if (err instanceof BackendError && err.status === 404) return null;
    throw err;
  }
}

export interface NewAnnouncementInput {
  title: string;
  content: string;
  type: AnnouncementType;
  priority: AnnouncementPriority;
  audience: AnnouncementAudience;
  publishAt: string;
  expiresAt?: string;
  saveAsDraft: boolean;
}

export async function addAnnouncement(input: NewAnnouncementInput): Promise<Announcement> {
  return toAnnouncement(
    await backend<ApiAnnouncement>("/announcements", {
      method: "POST",
      body: {
        title: input.title,
        content: input.content,
        type: input.type,
        priority: input.priority,
        audience: input.audience,
        requireAcknowledgement: false,
        publishAt: input.publishAt,
        expiresAt: input.expiresAt ?? null,
        saveAsDraft: input.saveAsDraft,
      },
    }),
  );
}

// Attached after creation (separate multipart endpoint, same convention as
// the leave request's attachment upload) - one call per file.
export async function addAnnouncementAttachment(id: string, file: File): Promise<Announcement> {
  const form = new FormData();
  form.append("file", file, file.name);
  return toAnnouncement(await backend<ApiAnnouncement>(`/announcements/${id}/attachments`, { method: "POST", form }));
}

export async function downloadAnnouncementAttachment(id: string, attachmentId: string): Promise<Response> {
  return backendRaw(`/announcements/${id}/attachments/${attachmentId}`);
}

export interface AnnouncementPatch {
  title?: string;
  content?: string;
  type?: AnnouncementType;
  priority?: AnnouncementPriority;
  audience?: AnnouncementAudience;
  publishAt?: string;
  expiresAt?: string | null;
  lifecycle?: AnnouncementLifecycle;
}

export async function patchAnnouncement(id: string, patch: AnnouncementPatch): Promise<Announcement | null> {
  try {
    return toAnnouncement(await backend<ApiAnnouncement>(`/announcements/${id}`, { method: "PATCH", body: patch }));
  } catch (err) {
    if (err instanceof BackendError && err.status === 404) return null;
    throw err;
  }
}

// The signed-in employee's own read receipt - idempotent.
export async function recordRead(id: string): Promise<Announcement | null> {
  try {
    return toAnnouncement(await backend<ApiAnnouncement>(`/announcements/${id}/read`, { method: "POST" }));
  } catch (err) {
    if (err instanceof BackendError && err.status === 404) return null;
    throw err;
  }
}
