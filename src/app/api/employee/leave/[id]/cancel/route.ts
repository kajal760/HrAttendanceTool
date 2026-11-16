import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api/backend";
import { cancelLeaveRequest } from "@/lib/hr/leave-store";
import { getSession } from "@/lib/auth/get-session";

export const dynamic = "force-dynamic";

// Pending requests, or approved leave that hasn't started yet.
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session?.employeeId) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  const { id } = await params;
  try {
    return NextResponse.json({ request: await cancelLeaveRequest(id) });
  } catch (err) {
    return errorResponse(err);
  }
}
