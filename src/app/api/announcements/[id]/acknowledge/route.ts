import { NextResponse } from "next/server";
import { recordAcknowledgement } from "@/lib/hr/announcement-store";
import { getSession } from "@/lib/auth/get-session";

export const dynamic = "force-dynamic";

// The employee is the signed-in session, not a client-supplied id.
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session?.employeeId) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  const { id } = await params;
  const announcement = await recordAcknowledgement(id, session.employeeId);
  if (!announcement) return NextResponse.json({ error: "Announcement not found." }, { status: 404 });
  return NextResponse.json({ announcement });
}
