import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type {
  Announcement,
  AnnouncementAttachment,
  AnnouncementAudience,
  AnnouncementCreatorRole,
  AnnouncementHistoryEvent,
  AnnouncementPriority,
  AnnouncementType,
} from "@/types/announcement";

// File-backed JSON store, same convention as `employee-store.ts`/
// `work-store.ts`: Next's dev server (Turbopack) runs route handlers and
// page components in separate module instances, so reading fresh from disk
// on every call sidesteps a plain in-memory array being invisible across
// them. Attachments are real uploaded files under `public/uploads/
// announcements`, same idea as `document-store.ts`.

const DATA_DIR = path.join(process.cwd(), ".data");
const INDEX_PATH = path.join(DATA_DIR, "announcements.json");
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "announcements");
const PUBLIC_PATH_PREFIX = "/uploads/announcements";

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function newId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.round(Math.random() * 1e6)}`;
}

const SEED_ANNOUNCEMENTS: Announcement[] = [
  {
    id: "ann-seed-1",
    title: "New Attendance Policy",
    content:
      "A new attendance policy will be effective from 1 October 2026. Core hours move to 9:30 AM - 6:30 PM, and remote work now requires manager approval per instance rather than a blanket weekly allowance. Please review the attached document before the effective date.",
    type: "Attendance",
    priority: "Important",
    audience: { type: "Everyone" },
    lifecycle: "Live",
    requireAcknowledgement: true,
    publishAt: "2026-09-25T09:00:00.000Z",
    attachments: [],
    createdByName: "HR",
    createdByRole: "HR",
    createdAt: "2026-09-24T14:00:00.000Z",
    updatedAt: "2026-09-25T09:00:00.000Z",
    reads: [
      { employeeId: "emp-1024", readAt: "2026-09-25T10:00:00.000Z" },
      { employeeId: "emp-1032", readAt: "2026-09-25T11:00:00.000Z" },
    ],
    acknowledgements: [{ employeeId: "emp-1024", acknowledgedAt: "2026-09-25T10:01:00.000Z" }],
    history: [
      { id: "ann-seed-1-h1", timestamp: "2026-09-24T14:00:00.000Z", type: "Created", performedBy: "HR (HR)" },
      { id: "ann-seed-1-h2", timestamp: "2026-09-25T09:00:00.000Z", type: "Published", performedBy: "HR (HR)" },
    ],
  },
  {
    id: "ann-seed-2",
    title: "Mandatory Security Training on Friday",
    content:
      "The Engineering team must complete the annual security awareness training this Friday. The session covers phishing recognition, credential hygiene, and the updated incident-reporting process. Attendance will be tracked.",
    type: "Training",
    priority: "Urgent",
    audience: { type: "Department", department: "Engineering" },
    lifecycle: "Live",
    requireAcknowledgement: false,
    publishAt: "2026-09-28T08:00:00.000Z",
    attachments: [],
    createdByName: "Super Admin",
    createdByRole: "Super Admin",
    createdAt: "2026-09-27T16:00:00.000Z",
    updatedAt: "2026-09-28T08:00:00.000Z",
    reads: [{ employeeId: "emp-1024", readAt: "2026-09-28T09:00:00.000Z" }],
    acknowledgements: [],
    history: [
      { id: "ann-seed-2-h1", timestamp: "2026-09-27T16:00:00.000Z", type: "Created", performedBy: "Super Admin (Super Admin)" },
      { id: "ann-seed-2-h2", timestamp: "2026-09-28T08:00:00.000Z", type: "Published", performedBy: "Super Admin (Super Admin)" },
    ],
  },
  {
    id: "ann-seed-3",
    title: "Company Holiday - Office Closed",
    content: "The office will be closed on 2 October for a public holiday. Client-facing teams should set their status accordingly.",
    type: "Holiday",
    priority: "Normal",
    audience: { type: "Everyone" },
    lifecycle: "Live",
    requireAcknowledgement: false,
    publishAt: "2026-09-29T09:00:00.000Z",
    expiresAt: "2026-10-03T00:00:00.000Z",
    attachments: [],
    createdByName: "HR",
    createdByRole: "HR",
    createdAt: "2026-09-29T09:00:00.000Z",
    updatedAt: "2026-09-29T09:00:00.000Z",
    reads: [],
    acknowledgements: [],
    history: [
      { id: "ann-seed-3-h1", timestamp: "2026-09-29T09:00:00.000Z", type: "Created", performedBy: "HR (HR)" },
      { id: "ann-seed-3-h2", timestamp: "2026-09-29T09:00:00.000Z", type: "Published", performedBy: "HR (HR)" },
    ],
  },
  {
    id: "ann-seed-4",
    title: "Draft: Updated Leave Policy",
    content: "Draft notes - revising carry-forward limits for casual leave. Not ready to publish yet.",
    type: "Policy",
    priority: "Important",
    audience: { type: "Everyone" },
    lifecycle: "Draft",
    requireAcknowledgement: true,
    publishAt: new Date().toISOString(),
    attachments: [],
    createdByName: "HR",
    createdByRole: "HR",
    createdAt: "2026-09-29T12:00:00.000Z",
    updatedAt: "2026-09-29T12:00:00.000Z",
    reads: [],
    acknowledgements: [],
    history: [{ id: "ann-seed-4-h1", timestamp: "2026-09-29T12:00:00.000Z", type: "Created", performedBy: "HR (HR)" }],
  },
];

async function readIndex(): Promise<Announcement[]> {
  try {
    const raw = await readFile(INDEX_PATH, "utf8");
    return JSON.parse(raw) as Announcement[];
  } catch {
    return SEED_ANNOUNCEMENTS;
  }
}

async function writeIndex(list: Announcement[]): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(INDEX_PATH, JSON.stringify(list, null, 2), "utf8");
}

export async function getAnnouncements(): Promise<Announcement[]> {
  return readIndex();
}

export async function getAnnouncement(id: string): Promise<Announcement | null> {
  const list = await readIndex();
  return list.find((a) => a.id === id) ?? null;
}

export async function saveAttachment(fileName: string, fileBytes: Uint8Array, contentType: string): Promise<AnnouncementAttachment> {
  const id = newId("att");
  const storedFileName = `${id}-${sanitizeFileName(fileName)}`;
  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(path.join(UPLOAD_DIR, storedFileName), fileBytes);
  return {
    id,
    name: fileName,
    url: `${PUBLIC_PATH_PREFIX}/${storedFileName}`,
    sizeBytes: fileBytes.byteLength,
    contentType,
  };
}

export interface NewAnnouncementInput {
  title: string;
  content: string;
  type: AnnouncementType;
  priority: AnnouncementPriority;
  audience: AnnouncementAudience;
  requireAcknowledgement: boolean;
  publishAt: string;
  expiresAt?: string;
  attachments: AnnouncementAttachment[];
  createdByName: string;
  createdByRole: AnnouncementCreatorRole;
  saveAsDraft: boolean;
}

function newEventId(): string {
  return `evt-${Date.now()}-${Math.round(Math.random() * 1e6)}`;
}

export async function addAnnouncement(input: NewAnnouncementInput): Promise<Announcement> {
  const now = new Date().toISOString();
  const performedBy = `${input.createdByName} (${input.createdByRole})`;
  const history: AnnouncementHistoryEvent[] = [
    { id: newEventId(), timestamp: now, type: "Created", performedBy },
  ];
  if (!input.saveAsDraft) {
    const isScheduled = new Date(input.publishAt) > new Date(now);
    history.push({ id: newEventId(), timestamp: now, type: isScheduled ? "Scheduled" : "Published", performedBy });
  }

  const announcement: Announcement = {
    id: newId("ann"),
    title: input.title,
    content: input.content,
    type: input.type,
    priority: input.priority,
    audience: input.audience,
    lifecycle: input.saveAsDraft ? "Draft" : "Live",
    requireAcknowledgement: input.requireAcknowledgement,
    publishAt: input.publishAt,
    expiresAt: input.expiresAt,
    attachments: input.attachments,
    createdByName: input.createdByName,
    createdByRole: input.createdByRole,
    createdAt: now,
    updatedAt: now,
    reads: [],
    acknowledgements: [],
    history,
  };

  const list = await readIndex();
  await writeIndex([announcement, ...list]);
  return announcement;
}

export type AnnouncementPatch = Partial<
  Pick<
    Announcement,
    | "title"
    | "content"
    | "type"
    | "priority"
    | "audience"
    | "lifecycle"
    | "requireAcknowledgement"
    | "publishAt"
    | "expiresAt"
    | "attachments"
  >
>;

export async function patchAnnouncement(
  id: string,
  patch: AnnouncementPatch,
  event?: Omit<AnnouncementHistoryEvent, "id" | "timestamp">,
): Promise<Announcement | null> {
  const list = await readIndex();
  const index = list.findIndex((a) => a.id === id);
  if (index === -1) return null;

  const current = list[index];
  const updated: Announcement = { ...current, ...patch, updatedAt: new Date().toISOString() };
  if (event) {
    const entry: AnnouncementHistoryEvent = { id: newEventId(), timestamp: new Date().toISOString(), ...event };
    updated.history = [entry, ...current.history];
  }
  list[index] = updated;
  await writeIndex(list);
  return updated;
}

export async function recordRead(id: string, employeeId: string): Promise<Announcement | null> {
  const list = await readIndex();
  const index = list.findIndex((a) => a.id === id);
  if (index === -1) return null;

  const current = list[index];
  if (current.reads.some((r) => r.employeeId === employeeId)) return current;

  const updated: Announcement = {
    ...current,
    reads: [...current.reads, { employeeId, readAt: new Date().toISOString() }],
  };
  list[index] = updated;
  await writeIndex(list);
  return updated;
}

export async function recordAcknowledgement(id: string, employeeId: string): Promise<Announcement | null> {
  const list = await readIndex();
  const index = list.findIndex((a) => a.id === id);
  if (index === -1) return null;

  const current = list[index];
  if (current.acknowledgements.some((a) => a.employeeId === employeeId)) return current;

  const updated: Announcement = {
    ...current,
    acknowledgements: [...current.acknowledgements, { employeeId, acknowledgedAt: new Date().toISOString() }],
  };
  list[index] = updated;
  await writeIndex(list);
  return updated;
}
