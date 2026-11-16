import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api/backend";
import { recordRead } from "@/lib/hr/announcement-store";
import { getSession } from "@/lib/auth/get-session";

export const dynamic = "force-dynamic";

// Fired when an employee opens an announcement's detail view - idempotent,
// so re-opening it doesn't create duplicate receipts. The employee is the
// signed-in session (the backend takes it from the token), not a
// client-supplied id.
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session?.employeeId) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  const { id } = await params;
  try {
    const announcement = await recordRead(id);
    if (!announcement) return NextResponse.json({ error: "Announcement not found." }, { status: 404 });
    return NextResponse.json({ announcement });
  } catch (err) {
    return errorResponse(err);
  }
}
