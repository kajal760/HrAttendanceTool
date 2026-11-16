import { NextResponse } from "next/server";
import { BackendError } from "@/lib/api/backend";
import { getDepartmentArchiveImpact } from "@/lib/hr/department-store";

export const dynamic = "force-dynamic";

// Active employee count for the archive confirmation dialog.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const impact = await getDepartmentArchiveImpact(id);
    return NextResponse.json(impact);
  } catch (err) {
    if (err instanceof BackendError) {
      return NextResponse.json({ error: err.detail }, { status: err.status });
    }
    throw err;
  }
}
