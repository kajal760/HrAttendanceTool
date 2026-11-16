import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api/backend";
import { downloadAnnouncementAttachment } from "@/lib/hr/announcement-store";
import { getSession } from "@/lib/auth/get-session";

export const dynamic = "force-dynamic";

// Streams an announcement attachment. The backend allows Admin/HR and any
// employee the announcement is actually visible to, and 404s for anyone else.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string; attachmentId: string }> }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  const { id, attachmentId } = await params;
  try {
    const res = await downloadAnnouncementAttachment(id, attachmentId);
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
