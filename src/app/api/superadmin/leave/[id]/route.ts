import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api/backend";
import { decideLeaveRequest } from "@/lib/hr/leave-store";
import { getSession } from "@/lib/auth/get-session";

export const dynamic = "force-dynamic";

// HR/Admin approve or reject. The backend only allows it from Pending (409
// otherwise), refuses HR deciding their own leave, and won't approve sick
// leave that needs a medical certificate until one is attached.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role === "Employee") {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { status, note } = body ?? {};

  if (status !== "Approved" && status !== "Rejected") {
    return NextResponse.json({ error: 'status must be "Approved" or "Rejected".' }, { status: 400 });
  }
  if (note !== undefined && typeof note !== "string") {
    return NextResponse.json({ error: "note must be a string." }, { status: 400 });
  }

  try {
    return NextResponse.json({ request: await decideLeaveRequest(id, status, note?.trim() || undefined) });
  } catch (err) {
    return errorResponse(err);
  }
}
