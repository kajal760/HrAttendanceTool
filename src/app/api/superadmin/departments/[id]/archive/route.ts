import { NextResponse } from "next/server";
import { archiveDepartment } from "@/lib/hr/department-store";

export const dynamic = "force-dynamic";

// 409s if the department is already archived.
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await archiveDepartment(id);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 409 });
  }
  return NextResponse.json({ department: result });
}
