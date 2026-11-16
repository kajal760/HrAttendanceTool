import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api/backend";
import { downloadLeaveAttachment } from "@/lib/hr/leave-store";
import { getSession } from "@/lib/auth/get-session";

export const dynamic = "force-dynamic";

// Streams a leave request's attachment. The backend allows the request's
// owner and Admin/HR, and 404s for anyone else.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  const { id } = await params;
  try {
    const res = await downloadLeaveAttachment(id);
    return new Response(res.body, {
      headers: {
        "Content-Type": res.headers.get("Content-Type") ?? "application/octet-stream",
        "Content-Disposition": res.headers.get("Content-Disposition") ?? "inline",
      },
    });
  } catch (err) {
    return errorResponse(err);
  }
}
