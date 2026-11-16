import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api/backend";
import { patchLeaveType, type LeaveTypePatch } from "@/lib/hr/leave-store";
import { getSession } from "@/lib/auth/get-session";

export const dynamic = "force-dynamic";

const FIELDS: (keyof LeaveTypePatch)[] = [
  "description",
  "annualQuota",
  "minDaysPerRequest",
  "maxDaysPerRequest",
  "allowHalfDay",
  "certificateRequiredAfterDays",
  "perOccurrenceDays",
  "maxOccurrences",
  "maxDaysBeforeEvent",
  "isActive",
];

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role === "Employee") {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const patch: LeaveTypePatch = {};
  for (const field of FIELDS) {
    if (body?.[field] !== undefined) (patch as Record<string, unknown>)[field] = body[field];
  }

  try {
    return NextResponse.json({ type: await patchLeaveType(id, patch) });
  } catch (err) {
    return errorResponse(err);
  }
}
