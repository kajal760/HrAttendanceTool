import { NextResponse } from "next/server";
import { getAnnouncement, patchAnnouncement } from "@/lib/hr/announcement-store";
import type { AnnouncementPatch } from "@/lib/hr/announcement-store";
import type { AnnouncementHistoryEventType, AnnouncementLifecycle } from "@/types/announcement";

export const dynamic = "force-dynamic";

const PERFORMED_BY = "Super Admin"; // TODO: read from the session once auth exists.

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const announcement = await getAnnouncement(id);
  if (!announcement) return NextResponse.json({ error: "Announcement not found." }, { status: 404 });
  return NextResponse.json({ announcement });
}

// Manager/HR full edit - content, schedule, audience, and lifecycle
// transitions (Draft -> Live, Live -> Archived). New file attachments aren't
// accepted here (only at creation) - editing can remove existing ones by
// passing a shorter `attachments` array, but adding new ones means a new
// announcement for now.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const current = await getAnnouncement(id);
  if (!current) return NextResponse.json({ error: "Announcement not found." }, { status: 404 });

  const body = await request.json();
  const patch: AnnouncementPatch = {};

  if (body.title !== undefined) patch.title = String(body.title).trim();
  if (body.content !== undefined) patch.content = String(body.content).trim();
  if (body.type !== undefined) patch.type = body.type;
  if (body.priority !== undefined) patch.priority = body.priority;
  if (body.audience !== undefined) patch.audience = body.audience;
  if (body.requireAcknowledgement !== undefined) patch.requireAcknowledgement = Boolean(body.requireAcknowledgement);
  if (body.publishAt !== undefined) patch.publishAt = body.publishAt;
  if (body.expiresAt !== undefined) patch.expiresAt = body.expiresAt || undefined;
  if (body.attachments !== undefined) patch.attachments = body.attachments;
  if (body.lifecycle !== undefined) patch.lifecycle = body.lifecycle as AnnouncementLifecycle;

  let event: { type: AnnouncementHistoryEventType; performedBy: string; detail?: string } | undefined;
  if (patch.lifecycle && patch.lifecycle !== current.lifecycle) {
    if (patch.lifecycle === "Live") {
      const publishAt = patch.publishAt ?? current.publishAt;
      event = { type: new Date(publishAt) > new Date() ? "Scheduled" : "Published", performedBy: PERFORMED_BY };
    } else if (patch.lifecycle === "Archived") {
      event = { type: "Archived", performedBy: PERFORMED_BY };
    }
  } else if (Object.keys(patch).length > 0) {
    event = { type: "Edited", performedBy: PERFORMED_BY };
  }

  const announcement = await patchAnnouncement(id, patch, event);
  if (!announcement) return NextResponse.json({ error: "Announcement not found." }, { status: 404 });
  return NextResponse.json({ announcement });
}
