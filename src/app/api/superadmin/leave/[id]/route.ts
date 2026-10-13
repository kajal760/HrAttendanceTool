import { NextResponse } from "next/server";
import { decideLeaveRequest } from "@/lib/hr/leave-store";
import { getSession } from "@/lib/auth/get-session";

export const dynamic = "force-dynamic";

// HR/Admin approve or reject - only works from Pending (see
// `decideLeaveRequest`), so a request can't be decided twice.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role === "Employee") {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { status, note } = body ?? {};

  if (status !== "Approved" && status !== "Rejected") {
    return NextResponse.json({ error: "status must be \"Approved\" or \"Rejected\"." }, { status: 400 });
  }
  if (note !== undefined && typeof note !== "string") {
    return NextResponse.json({ error: "note must be a string." }, { status: 400 });
  }

  const result = await decideLeaveRequest(id, status, session.name, note?.trim() || undefined);
  if (result === null) {
    return NextResponse.json({ error: "Leave request not found." }, { status: 404 });
  }
  if (result === "not-pending") {
    return NextResponse.json({ error: "This request has already been decided." }, { status: 409 });
  }
  return NextResponse.json({ request: result });
}
