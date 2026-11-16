import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api/backend";
import { createTrainingProgramme, getTrainingProgrammes } from "@/lib/hr/training-store";
import { TRAINING_CATEGORIES, TRAINING_MODES } from "@/types/training";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const includeInactive = searchParams.get("includeInactive") === "true";
  try {
    return NextResponse.json({ programmes: await getTrainingProgrammes(includeInactive) });
  } catch (err) {
    return errorResponse(err);
  }
}

function str(value: unknown): string | undefined {
  return typeof value === "string" && value ? value : undefined;
}

export async function POST(request: Request) {
  const body = await request.json();
  const { name, category, mode, description, trainerName, provider, startDate, endDate, durationHours, cost } = body ?? {};
  if (typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Training name is required." }, { status: 400 });
  }
  if (!TRAINING_CATEGORIES.includes(category)) {
    return NextResponse.json({ error: "Choose a valid category." }, { status: 400 });
  }
  if (!TRAINING_MODES.includes(mode)) {
    return NextResponse.json({ error: "Choose a valid training mode." }, { status: 400 });
  }
  try {
    const programme = await createTrainingProgramme({
      name,
      category,
      mode,
      description: str(description),
      trainerName: str(trainerName),
      provider: str(provider),
      startDate: str(startDate),
      endDate: str(endDate),
      durationHours: typeof durationHours === "number" ? durationHours : undefined,
      cost: typeof cost === "number" ? cost : undefined,
    });
    return NextResponse.json({ programme }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
