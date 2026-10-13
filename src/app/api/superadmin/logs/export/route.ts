import { NextResponse } from "next/server";
import { recordExportEvent } from "@/lib/superadmin/log-store";

export const dynamic = "force-dynamic";

// Fired (fire-and-forget) whenever a CSV export actually happens client-side
// (see `EmployeeGrid.tsx`'s `exportCsv`) - the only genuinely real source
// behind the Log page's "Export" module.
export async function POST(request: Request) {
  const body = await request.json();
  const { detail } = body ?? {};
  if (typeof detail !== "string" || detail.trim().length === 0) {
    return NextResponse.json({ error: "detail is required." }, { status: 400 });
  }
  const entry = await recordExportEvent(detail.trim());
  return NextResponse.json({ entry }, { status: 201 });
}
