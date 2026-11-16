import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api/backend";
import { getEmployeeDocuments } from "@/lib/superadmin/document-store";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    return NextResponse.json({ documents: await getEmployeeDocuments(id) });
  } catch (err) {
    return errorResponse(err);
  }
}
