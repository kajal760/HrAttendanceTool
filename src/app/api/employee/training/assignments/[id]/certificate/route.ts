import { NextResponse } from "next/server";
import { backendRaw, errorResponse } from "@/lib/api/backend";

export const dynamic = "force-dynamic";

// Employees can only download their own certificate, never upload/replace it
// - certificate issuance stays an HR action (see the superadmin route).
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const res = await backendRaw(`/training/assignments/${id}/certificate`);
    return new NextResponse(res.body, {
      status: res.status,
      headers: {
        "Content-Type": res.headers.get("Content-Type") ?? "application/octet-stream",
        "Content-Disposition": res.headers.get("Content-Disposition") ?? "attachment",
      },
    });
  } catch (err) {
    return errorResponse(err);
  }
}
