import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api/backend";
import { updatePoshComplaintStatus } from "@/lib/hr/posh-store";
import type { PoshComplaintStatus } from "@/types/posh";

export const dynamic = "force-dynamic";

const VALID_STATUSES: PoshComplaintStatus[] = ["Submitted", "Under Review", "Resolved"];

// Admin can see the complaint queue (same shared /hr /superadmin tree as
// everything else) but only HR can move a complaint's status - the backend
// enforces this (403 for Admin), same HR-only-write pattern as the Org
// Structure edit guard.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const status = body?.status;
  if (typeof status !== "string" || !VALID_STATUSES.includes(status as PoshComplaintStatus)) {
    return NextResponse.json({ error: "A valid status is required." }, { status: 400 });
  }
  const resolutionNote = typeof body?.resolutionNote === "string" ? body.resolutionNote.trim() || undefined : undefined;

  try {
    const complaint = await updatePoshComplaintStatus(id, status as PoshComplaintStatus, resolutionNote);
    return NextResponse.json({ complaint });
  } catch (err) {
    return errorResponse(err);
  }
}
