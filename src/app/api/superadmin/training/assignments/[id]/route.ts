import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api/backend";
import { updateTrainingAssignment } from "@/lib/hr/training-store";
import { TRAINING_ATTENDANCES, TRAINING_PRIORITIES, TRAINING_STATUSES } from "@/types/training";

export const dynamic = "force-dynamic";

function str(value: unknown): string | undefined {
  return typeof value === "string" && value ? value : undefined;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const { status, priority, attendance } = body ?? {};
  if (status !== undefined && !TRAINING_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Choose a valid status." }, { status: 400 });
  }
  if (priority !== undefined && priority !== "" && !TRAINING_PRIORITIES.includes(priority)) {
    return NextResponse.json({ error: "Choose a valid priority." }, { status: 400 });
  }
  if (attendance !== undefined && attendance !== "" && !TRAINING_ATTENDANCES.includes(attendance)) {
    return NextResponse.json({ error: "Choose a valid attendance value." }, { status: 400 });
  }
  try {
    const assignment = await updateTrainingAssignment(id, {
      status,
      progress: typeof body?.progress === "number" ? body.progress : undefined,
      attendance: attendance || undefined,
      assessmentScore: typeof body?.assessmentScore === "number" ? body.assessmentScore : undefined,
      feedback: str(body?.feedback),
      trainerRemarks: str(body?.trainerRemarks),
      completionDate: str(body?.completionDate),
      dueDate: str(body?.dueDate),
      priority: priority || undefined,
      assignedBy: str(body?.assignedBy),
      certificateName: str(body?.certificateName),
      certificateRef: str(body?.certificateRef),
      certIssueDate: str(body?.certIssueDate),
      certExpiryDate: str(body?.certExpiryDate),
      certVerificationLink: str(body?.certVerificationLink),
    });
    return NextResponse.json({ assignment });
  } catch (err) {
    return errorResponse(err);
  }
}
