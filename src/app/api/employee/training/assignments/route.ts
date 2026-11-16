import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api/backend";
import { getMyTrainingAssignments } from "@/lib/hr/training-store";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  try {
    const assignments = await getMyTrainingAssignments(searchParams.get("status") ?? undefined);
    return NextResponse.json({ assignments });
  } catch (err) {
    return errorResponse(err);
  }
}
