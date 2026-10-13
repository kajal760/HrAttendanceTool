import { NextResponse } from "next/server";
import { getTimesheetEntries } from "@/lib/hr/timesheet-store";
import { getSession } from "@/lib/auth/get-session";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session || session.role === "Employee") {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;
  const entries = await getTimesheetEntries({ from, to });
  return NextResponse.json({ entries });
}
