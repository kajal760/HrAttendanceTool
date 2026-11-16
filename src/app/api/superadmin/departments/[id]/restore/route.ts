import { NextResponse } from "next/server";
import { restoreDepartment } from "@/lib/hr/department-store";

export const dynamic = "force-dynamic";

// 409s if the department isn't archived, or if the 7-day restore window
// (from `archivedAt`) has passed.
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await restoreDepartment(id);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 409 });
  }
  return NextResponse.json({ department: result });
}
