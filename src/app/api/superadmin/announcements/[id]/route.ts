import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api/backend";
import { getAnnouncement, patchAnnouncement } from "@/lib/hr/announcement-store";
import type { AnnouncementPatch } from "@/lib/hr/announcement-store";
import type { AnnouncementLifecycle } from "@/types/announcement";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const announcement = await getAnnouncement(id);
    if (!announcement) return NextResponse.json({ error: "Announcement not found." }, { status: 404 });
    return NextResponse.json({ announcement });
  } catch (err) {
    return errorResponse(err);
  }
}

// Manager/HR full edit - content, schedule, audience, and lifecycle
// transitions (Draft -> Live, Live -> Archived). Attachments aren't accepted
// here - they're added via their own endpoint (see the superadmin
// announcements POST route) and can't yet be removed after upload.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const patch: AnnouncementPatch = {};

  if (body.title !== undefined) patch.title = String(body.title).trim();
  if (body.content !== undefined) patch.content = String(body.content).trim();
  if (body.type !== undefined) patch.type = body.type;
  if (body.priority !== undefined) patch.priority = body.priority;
  if (body.audience !== undefined) patch.audience = body.audience;
  if (body.publishAt !== undefined) patch.publishAt = body.publishAt;
  if (body.expiresAt !== undefined) patch.expiresAt = body.expiresAt || null;
  if (body.lifecycle !== undefined) patch.lifecycle = body.lifecycle as AnnouncementLifecycle;

  try {
    const announcement = await patchAnnouncement(id, patch);
    if (!announcement) return NextResponse.json({ error: "Announcement not found." }, { status: 404 });
    return NextResponse.json({ announcement });
  } catch (err) {
    return errorResponse(err);
  }
}
