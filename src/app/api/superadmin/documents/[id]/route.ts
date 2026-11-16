import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api/backend";
import { deleteDocument } from "@/lib/superadmin/document-store";

export const dynamic = "force-dynamic";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await deleteDocument(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
