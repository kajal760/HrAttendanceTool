import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api/backend";
import { uploadLeaveAttachment } from "@/lib/hr/leave-store";
import { getSession } from "@/lib/auth/get-session";

export const dynamic = "force-dynamic";

// Medical certificate / supporting document for one of your own pending
// requests: multipart/form-data with a single "file" field (PDF/JPG/PNG).
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session?.employeeId) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  const { id } = await params;
  const file = (await request.formData()).get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Choose a file to attach." }, { status: 400 });
  }
  try {
    return NextResponse.json({ request: await uploadLeaveAttachment(id, file) });
  } catch (err) {
    return errorResponse(err);
  }
}
