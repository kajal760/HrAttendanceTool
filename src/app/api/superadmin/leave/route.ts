import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api/backend";
import { getLeaveRequests } from "@/lib/hr/leave-store";
import { getSession } from "@/lib/auth/get-session";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session || session.role === "Employee") {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  try {
    return NextResponse.json({ requests: await getLeaveRequests() });
  } catch (err) {
    return errorResponse(err);
  }
}
