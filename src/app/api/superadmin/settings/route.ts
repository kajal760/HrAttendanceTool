import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api/backend";
import { getSettings, patchSettings } from "@/lib/hr/settings-store";
import { getSession } from "@/lib/auth/get-session";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session || session.role === "Employee") {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  try {
    return NextResponse.json({ settings: await getSettings() });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session || session.role === "Employee") {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const body = await request.json();
  const { leaveYearStart, celebrations } = body ?? {};

  if (leaveYearStart !== undefined) {
    if (typeof leaveYearStart !== "string" || !/^\d{2}-\d{2}$/.test(leaveYearStart)) {
      return NextResponse.json({ error: "leaveYearStart must be a \"MM-DD\" string." }, { status: 400 });
    }
  }
  if (celebrations !== undefined && (typeof celebrations !== "object" || celebrations === null)) {
    return NextResponse.json({ error: "celebrations must be an object." }, { status: 400 });
  }

  try {
    const updated = await patchSettings({ leaveYearStart, celebrations });
    return NextResponse.json({ settings: updated });
  } catch (err) {
    return errorResponse(err);
  }
}
