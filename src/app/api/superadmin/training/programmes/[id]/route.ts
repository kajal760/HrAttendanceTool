import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api/backend";
import { updateTrainingProgramme } from "@/lib/hr/training-store";
import { TRAINING_CATEGORIES, TRAINING_MODES } from "@/types/training";

export const dynamic = "force-dynamic";

function str(value: unknown): string | undefined {
  return typeof value === "string" && value ? value : undefined;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const { category, mode } = body ?? {};
  if (category !== undefined && !TRAINING_CATEGORIES.includes(category)) {
    return NextResponse.json({ error: "Choose a valid category." }, { status: 400 });
  }
  if (mode !== undefined && !TRAINING_MODES.includes(mode)) {
    return NextResponse.json({ error: "Choose a valid training mode." }, { status: 400 });
  }
  try {
    const programme = await updateTrainingProgramme(id, {
      name: typeof body?.name === "string" ? body.name : undefined,
      category,
      mode,
      description: str(body?.description),
      trainerName: str(body?.trainerName),
      provider: str(body?.provider),
      startDate: str(body?.startDate),
      endDate: str(body?.endDate),
      durationHours: typeof body?.durationHours === "number" ? body.durationHours : undefined,
      cost: typeof body?.cost === "number" ? body.cost : undefined,
      isActive: typeof body?.isActive === "boolean" ? body.isActive : undefined,
    });
    return NextResponse.json({ programme });
  } catch (err) {
    return errorResponse(err);
  }
}
