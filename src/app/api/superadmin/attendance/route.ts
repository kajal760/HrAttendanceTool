import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/get-session";
import { clockIn, clockOut } from "@/lib/hr/attendance-store";

export const dynamic = "force-dynamic";

// The user is the signed-in session, never a client-supplied id.
export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role === "Employee") {
    return NextResponse.json({ error: "Sign in as an admin or HR to clock in." }, { status: 401 });
  }
  const body = await request.json();
  const action = body?.action;
  const result =
    action === "clock-in" ? await clockIn(session.userId) : action === "clock-out" ? await clockOut(session.userId) : null;
  if (!result) return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 409 });
  return NextResponse.json({ record: result.record });
}
