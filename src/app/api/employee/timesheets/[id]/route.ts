import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api/backend";
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

  try {
    const result = await patchTimesheetEntry(id, {
      hours,
      description: description !== undefined ? description.trim() : undefined,
      taskId,
    });
    if (result === null) return NextResponse.json({ error: "Entry not found." }, { status: 404 });
    if (result === "forbidden") return NextResponse.json({ error: "Only the owner can edit this entry." }, { status: 403 });
    return NextResponse.json({ entry: result });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session?.employeeId) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const { id } = await params;
  try {
    const result = await deleteTimesheetEntry(id);
    if (result === null) return NextResponse.json({ error: "Entry not found." }, { status: 404 });
    if (result === "forbidden") return NextResponse.json({ error: "Only the owner can delete this entry." }, { status: 403 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
