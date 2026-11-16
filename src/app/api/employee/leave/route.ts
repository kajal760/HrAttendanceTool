import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api/backend";
import { addLeaveRequest, getLeaveRequestsForEmployee } from "@/lib/hr/leave-store";
import { getSession } from "@/lib/auth/get-session";
import { parseLeaveInput } from "./parse";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session?.employeeId) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  try {
    return NextResponse.json({ requests: await getLeaveRequestsForEmployee(session.employeeId) });
  } catch (err) {
    return errorResponse(err);
  }
}

// The backend takes the employee from the session's token, never the
// request body, so one employee can't apply for leave on another's behalf.
// Policy errors (yearly limit, max days, overlap, ...) come back as its own message.
export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.employeeId) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  const parsed = parseLeaveInput(await request.json());
  if ("error" in parsed) return NextResponse.json(parsed, { status: 400 });
  if (parsed.reason.length < 10) {
    return NextResponse.json({ error: "Please add a short reason (10+ characters)." }, { status: 400 });
  }
  try {
    return NextResponse.json({ request: await addLeaveRequest(parsed) }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
