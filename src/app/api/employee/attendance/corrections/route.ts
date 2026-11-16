import { NextResponse } from "next/server";
import { addCorrection, getCorrectionsForEmployee } from "@/lib/hr/attendance-corrections";
import { getSession } from "@/lib/auth/get-session";
import { errorResponse } from "@/lib/api/backend";

export const dynamic = "force-dynamic";

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export async function GET() {
  const session = await getSession();
  if (!session?.employeeId) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  return NextResponse.json({ requests: await getCorrectionsForEmployee(session.employeeId) });
}

// employeeId comes from the session, never the request body, so one
// employee can't submit a correction on another's behalf.
export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.employeeId) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const body = await request.json();
  const { date, requestedCheckIn, requestedCheckOut, reason } = body ?? {};

  if (typeof date !== "string" || Number.isNaN(Date.parse(date)) || date > new Date().toLocaleDateString("en-CA")) {
    return NextResponse.json({ error: "Choose a valid date, not in the future." }, { status: 400 });
  }
  if (typeof requestedCheckIn !== "string" || !TIME_RE.test(requestedCheckIn)) {
    return NextResponse.json({ error: "Choose a valid requested clock-in time." }, { status: 400 });
  }
  if (requestedCheckOut !== undefined && (typeof requestedCheckOut !== "string" || !TIME_RE.test(requestedCheckOut))) {
    return NextResponse.json({ error: "Requested clock-out time is invalid." }, { status: 400 });
  }
  if (typeof reason !== "string" || reason.trim().length < 10) {
    return NextResponse.json({ error: "Please add a justification (10+ characters)." }, { status: 400 });
  }

  try {
    const result = await addCorrection({
      employeeId: session.employeeId,
      date,
      requestedCheckIn,
      requestedCheckOut,
      reason: reason.trim(),
    });
    return NextResponse.json({ request: result }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
