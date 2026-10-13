import { NextResponse } from "next/server";
import { deleteTimesheetEntry, patchTimesheetEntry } from "@/lib/hr/timesheet-store";
import { getSession } from "@/lib/auth/get-session";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session?.employeeId) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { hours, description, taskId } = body ?? {};

  if (hours !== undefined && typeof hours !== "number") {
    return NextResponse.json({ error: "hours must be a number." }, { status: 400 });
  }
  if (description !== undefined && (typeof description !== "string" || description.trim().length < 5)) {
    return NextResponse.json({ error: "Description must be at least 5 characters." }, { status: 400 });
  }

  const result = await patchTimesheetEntry(id, session.employeeId, {
    hours,
    description: description !== undefined ? description.trim() : undefined,
    taskId,
  });

  if (result === null) return NextResponse.json({ error: "Entry not found." }, { status: 404 });
  if (result === "forbidden") return NextResponse.json({ error: "Only the owner can edit this entry." }, { status: 403 });
  if (result === "invalid-hours") return NextResponse.json({ error: "Hours must be between 0.25 and 24." }, { status: 400 });
  return NextResponse.json({ entry: result });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session?.employeeId) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const { id } = await params;
  const result = await deleteTimesheetEntry(id, session.employeeId);

  if (result === null) return NextResponse.json({ error: "Entry not found." }, { status: 404 });
  if (result === "forbidden") return NextResponse.json({ error: "Only the owner can delete this entry." }, { status: 403 });
  return NextResponse.json({ ok: true });
}
