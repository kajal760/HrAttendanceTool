import { NextResponse } from "next/server";
import { decideCorrection } from "@/lib/hr/attendance-corrections";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const status = body?.status;
  if (status !== "Approved" && status !== "Rejected") {
    return NextResponse.json({ error: "Status must be Approved or Rejected." }, { status: 400 });
  }
  const result = await decideCorrection(id, status);
  if (result === null) return NextResponse.json({ error: "Request not found." }, { status: 404 });
  if (result === "already-decided") {
    return NextResponse.json({ error: "This request has already been decided." }, { status: 409 });
  }
  return NextResponse.json({ correction: result });
}
