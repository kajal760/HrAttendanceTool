import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api/backend";
import { addTimesheetEntry, getMyTimesheetEntries } from "@/lib/hr/timesheet-store";
import { getSession } from "@/lib/auth/get-session";

export const dynamic = "force-dynamic";

// ?scope=mine (default) or ?scope=department - an employee can see their
// own entries, or read-only entries from everyone in their own department.
export async function GET(request: Request) {
  const session = await getSession();
  if (!session?.employeeId) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const scope = searchParams.get("scope") === "department" ? "department" : "mine";
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;

  try {
    const entries = await getMyTimesheetEntries({ scope, from, to });
    return NextResponse.json({ entries });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.employeeId) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const body = await request.json();
  const { date, hours, description, taskId } = body ?? {};

  if (typeof date !== "string" || Number.isNaN(Date.parse(date))) {
    return NextResponse.json({ error: "Choose a valid date." }, { status: 400 });
  }
  if (typeof hours !== "number" || Number.isNaN(hours)) {
    return NextResponse.json({ error: "Enter the hours worked." }, { status: 400 });
  }
  if (typeof description !== "string" || description.trim().length < 5) {
    return NextResponse.json({ error: "Add a short description (5+ characters)." }, { status: 400 });
  }
  if (taskId !== undefined && typeof taskId !== "string") {
    return NextResponse.json({ error: "taskId must be a string." }, { status: 400 });
  }

  try {
    const entry = await addTimesheetEntry({
      date,
      hours,
      description: description.trim(),
      taskId: taskId || undefined,
    });
    return NextResponse.json({ entry }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
