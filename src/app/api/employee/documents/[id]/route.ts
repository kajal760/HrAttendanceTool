import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api/backend";
import { deleteMyDocument } from "@/lib/superadmin/document-store";
import { getSession } from "@/lib/auth/get-session";

export const dynamic = "force-dynamic";

// Lets an employee remove a certificate they uploaded themselves - never one
// of the documents HR manages for them (ID proof, offer letter, ...). The
// backend enforces ownership (and that it's actually a Certificate) against
// the session's own employeeId, not just existence of the id.
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session?.employeeId) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const { id } = await params;
  try {
    await deleteMyDocument(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
