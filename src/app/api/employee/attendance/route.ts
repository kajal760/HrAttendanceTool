import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/get-session";
import { errorResponse } from "@/lib/api/backend";
import {
  clockIn,
  clockOut,
  endBreak,
  getTodayRecord,
  startBreak,
  type ClockResult,
} from "@/lib/hr/attendance-store";
import type { GeoPoint, WorkMode } from "@/types/employee";

export const dynamic = "force-dynamic";

// The signed-in employee's own clock for today (Attendance > Today and the
// dashboard's hours card). The backend works off the session's token, so
// nobody can clock in for someone else.
export async function GET() {
  const session = await getSession();
  if (!session?.employeeId) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  try {
    return NextResponse.json({ record: await getTodayRecord() });
  } catch (err) {
    return errorResponse(err);
  }
}

function parseLocation(value: unknown): GeoPoint | undefined {
  const { lat, lng } = (value ?? {}) as Record<string, unknown>;
  return typeof lat === "number" && typeof lng === "number" ? { lat, lng } : undefined;
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.employeeId) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  const body = await request.json();
  const workMode: WorkMode = body?.workMode === "Work From Home" ? "Work From Home" : "Office";
  const location = parseLocation(body?.location);

  const actions: Record<string, () => Promise<ClockResult>> = {
    "clock-in": () => clockIn(workMode, location),
    "clock-out": clockOut,
    "break-start": startBreak,
    "break-end": endBreak,
  };
  const action = actions[body?.action];
  if (!action) return NextResponse.json({ error: "Unknown action." }, { status: 400 });

  try {
    const result = await action();
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: 409 });
    return NextResponse.json({ record: result.record });
  } catch (err) {
    return errorResponse(err);
  }
}
