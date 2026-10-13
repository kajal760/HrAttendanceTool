import { NextResponse } from "next/server";
import { addAnnouncement, getAnnouncements, saveAttachment } from "@/lib/hr/announcement-store";
import { ANNOUNCEMENT_CREATOR_ROLES, ANNOUNCEMENT_PRIORITIES, ANNOUNCEMENT_TYPES } from "@/types/announcement";
import type { AnnouncementAudience, AnnouncementAudienceType } from "@/types/announcement";

export const dynamic = "force-dynamic";

const AUDIENCE_TYPES: AnnouncementAudienceType[] = ["Everyone", "Department", "Team", "Employees", "Managers", "HR"];

export async function GET() {
  return NextResponse.json({ announcements: await getAnnouncements() });
}

// Multipart (not JSON) because attachments are real uploaded files - see
// `saveAttachment` in `announcement-store.ts`.
export async function POST(request: Request) {
  const form = await request.formData();

  const title = String(form.get("title") ?? "").trim();
  const content = String(form.get("content") ?? "").trim();
  const type = String(form.get("type") ?? "");
  const priority = String(form.get("priority") ?? "");
  const audienceType = String(form.get("audienceType") ?? "");
  const audienceDepartment = form.get("audienceDepartment");
  const audienceManagerId = form.get("audienceManagerId");
  const audienceEmployeeIdsRaw = form.get("audienceEmployeeIds");
  const requireAcknowledgement = form.get("requireAcknowledgement") === "true";
  const saveAsDraft = form.get("saveAsDraft") === "true";
  const publishMode = form.get("publishMode");
  const scheduledAt = form.get("scheduledAt");
  const expiresAt = form.get("expiresAt");
  const createdByName = String(form.get("createdByName") ?? "").trim();
  const createdByRole = String(form.get("createdByRole") ?? "");

  if (!title) return NextResponse.json({ error: "Title is required." }, { status: 400 });
  if (!content) return NextResponse.json({ error: "Content is required." }, { status: 400 });
  if (!ANNOUNCEMENT_TYPES.includes(type as never)) {
    return NextResponse.json({ error: "Invalid announcement type." }, { status: 400 });
  }
  if (!ANNOUNCEMENT_PRIORITIES.includes(priority as never)) {
    return NextResponse.json({ error: "Invalid priority." }, { status: 400 });
  }
  if (!AUDIENCE_TYPES.includes(audienceType as AnnouncementAudienceType)) {
    return NextResponse.json({ error: "Invalid audience." }, { status: 400 });
  }
  if (!createdByName) return NextResponse.json({ error: "createdByName is required." }, { status: 400 });
  if (!ANNOUNCEMENT_CREATOR_ROLES.includes(createdByRole as never)) {
    return NextResponse.json({ error: "Invalid createdByRole." }, { status: 400 });
  }

  const audience: AnnouncementAudience = { type: audienceType as AnnouncementAudienceType };
  if (audience.type === "Department") {
    if (typeof audienceDepartment !== "string" || !audienceDepartment) {
      return NextResponse.json({ error: "Choose a department." }, { status: 400 });
    }
    audience.department = audienceDepartment;
  }
  if (audience.type === "Team") {
    if (typeof audienceManagerId !== "string" || !audienceManagerId) {
      return NextResponse.json({ error: "Choose a manager." }, { status: 400 });
    }
    audience.managerId = audienceManagerId;
  }
  if (audience.type === "Employees") {
    try {
      const ids = JSON.parse(String(audienceEmployeeIdsRaw ?? "[]"));
      if (!Array.isArray(ids) || ids.length === 0 || !ids.every((id) => typeof id === "string")) {
        return NextResponse.json({ error: "Select at least one employee." }, { status: 400 });
      }
      audience.employeeIds = ids;
    } catch {
      return NextResponse.json({ error: "Invalid employee selection." }, { status: 400 });
    }
  }

  let publishAt: string;
  if (saveAsDraft) {
    publishAt = new Date().toISOString();
  } else if (publishMode === "schedule") {
    if (typeof scheduledAt !== "string" || Number.isNaN(Date.parse(scheduledAt))) {
      return NextResponse.json({ error: "A valid schedule date/time is required." }, { status: 400 });
    }
    publishAt = new Date(scheduledAt).toISOString();
  } else {
    publishAt = new Date().toISOString();
  }

  let expiresAtIso: string | undefined;
  if (typeof expiresAt === "string" && expiresAt) {
    if (Number.isNaN(Date.parse(expiresAt))) {
      return NextResponse.json({ error: "Invalid expiry date." }, { status: 400 });
    }
    expiresAtIso = new Date(expiresAt).toISOString();
  }

  const files = form.getAll("attachments").filter((f): f is File => f instanceof File && f.size > 0);
  const attachments = await Promise.all(
    files.map(async (file) => saveAttachment(file.name, new Uint8Array(await file.arrayBuffer()), file.type || "application/octet-stream")),
  );

  const announcement = await addAnnouncement({
    title,
    content,
    type: type as (typeof ANNOUNCEMENT_TYPES)[number],
    priority: priority as (typeof ANNOUNCEMENT_PRIORITIES)[number],
    audience,
    requireAcknowledgement,
    publishAt,
    expiresAt: expiresAtIso,
    attachments,
    createdByName,
    createdByRole: createdByRole as (typeof ANNOUNCEMENT_CREATOR_ROLES)[number],
    saveAsDraft,
  });

  return NextResponse.json({ announcement }, { status: 201 });
}
