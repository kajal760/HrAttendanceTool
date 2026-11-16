import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api/backend";
import { createTrainingAssignment, getTrainingAssignments } from "@/lib/hr/training-store";
import { TRAINING_PRIORITIES } from "@/types/training";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  try {
    const assignments = await getTrainingAssignments({
      employeeId: searchParams.get("employeeId") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      programmeId: searchParams.get("programmeId") ?? undefined,
    });
    return NextResponse.json({ assignments });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(request: Request) {
  const body = await request.json();
  const { programmeId, employeeId, assignedDate, dueDate, priority, assignedBy } = body ?? {};
  if (typeof programmeId !== "string" || !programmeId) {
    return NextResponse.json({ error: "Select a training programme." }, { status: 400 });
  }
  if (typeof employeeId !== "string" || !employeeId) {
    return NextResponse.json({ error: "Select an employee." }, { status: 400 });
  }
  if (typeof assignedDate !== "string" || !assignedDate) {
    return NextResponse.json({ error: "Assigned date is required." }, { status: 400 });
  }
  if (priority !== undefined && priority !== "" && !TRAINING_PRIORITIES.includes(priority)) {
    return NextResponse.json({ error: "Choose a valid priority." }, { status: 400 });
  }
  try {
    const assignment = await createTrainingAssignment({
      programmeId,
      employeeId,
      assignedDate,
      dueDate: typeof dueDate === "string" && dueDate ? dueDate : undefined,
      priority: priority || undefined,
      assignedBy: typeof assignedBy === "string" && assignedBy ? assignedBy : undefined,
    });
    return NextResponse.json({ assignment }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
