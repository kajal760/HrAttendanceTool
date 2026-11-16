import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api/backend";
import { previewLeaveRequest } from "@/lib/hr/leave-store";
import { getSession } from "@/lib/auth/get-session";
import { parseLeaveInput } from "../parse";

export const dynamic = "force-dynamic";

// Live day count / policy check for the apply form, before submitting.
export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.employeeId) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  const parsed = parseLeaveInput(await request.json());
  if ("error" in parsed) return NextResponse.json(parsed, { status: 400 });
  try {
    return NextResponse.json(await previewLeaveRequest({ ...parsed, reason: parsed.reason || "preview" }));
  } catch (err) {
    return errorResponse(err);
  }
}
