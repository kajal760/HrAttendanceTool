import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api/backend";
import { updateTrainingAssignment } from "@/lib/hr/training-store";
import { TRAINING_ATTENDANCES, TRAINING_STATUSES } from "@/types/training";

export const dynamic = "force-dynamic";

// Employee self-service update - deliberately a narrower field set than the
// HR/superadmin PATCH route: an employee can report their own progress,
// status, attendance and feedback, but not assessment score, trainer
// remarks, due date/priority, or certificate details - those stay HR-only.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const { status, attendance } = body ?? {};
  if (status !== undefined && !TRAINING_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Choose a valid status." }, { status: 400 });
  }
  if (attendance !== undefined && attendance !== "" && !TRAINING_ATTENDANCES.includes(attendance)) {
    return NextResponse.json({ error: "Choose a valid attendance value." }, { status: 400 });
  }
  try {
    const assignment = await updateTrainingAssignment(id, {
      status,
      progress: typeof body?.progress === "number" ? body.progress : undefined,
      attendance: attendance || undefined,
      feedback: typeof body?.feedback === "string" ? body.feedback : undefined,
      completionDate: typeof body?.completionDate === "string" ? body.completionDate : undefined,
    });
    return NextResponse.json({ assignment });
  } catch (err) {
    return errorResponse(err);
  }
}
