import { NextResponse } from "next/server";
import { addTimesheetEntry, getTimesheetEntries } from "@/lib/hr/timesheet-store";
import { getEmployee, getEmployeeOverviews } from "@/lib/hr/employee-store";
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
  const scope = searchParams.get("scope") ?? "mine";
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;

  if (scope === "department") {
    const me = await getEmployee(session.employeeId);
    if (!me) return NextResponse.json({ error: "Employee record not found." }, { status: 404 });
    const all = await getEmployeeOverviews();
    const employeeIds = all.filter((e) => e.department === me.department).map((e) => e.id);
    const entries = await getTimesheetEntries({ from, to, employeeIds });
    return NextResponse.json({ entries });
  }

  const entries = await getTimesheetEntries({ from, to, employeeIds: [session.employeeId] });
  return NextResponse.json({ entries });
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

  const result = await addTimesheetEntry({
    employeeId: session.employeeId,
    date,
    hours,
    description: description.trim(),
    taskId: taskId || undefined,
  });

  if (result === "invalid-hours") {
    return NextResponse.json({ error: "Hours must be between 0.25 and 24." }, { status: 400 });
  }
  if (result === "invalid-task") {
    return NextResponse.json({ error: "Choose one of your own assigned tasks." }, { status: 400 });
  }
  if (result === "day-exceeded") {
    return NextResponse.json({ error: "That would put this day over 24 hours total." }, { status: 400 });
  }
  return NextResponse.json({ entry: result }, { status: 201 });
}
