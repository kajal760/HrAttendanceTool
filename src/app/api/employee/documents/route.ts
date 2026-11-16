import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api/backend";
import { addMyDocument, getMyDocuments } from "@/lib/superadmin/document-store";
import { getSession } from "@/lib/auth/get-session";

export const dynamic = "force-dynamic";

const MAX_FILE_BYTES = 20 * 1024 * 1024; // 20MB

// An employee's own self-uploaded certificates - scoped to their session's
// employeeId and always category "Certificate", so this never surfaces (or
// lets them touch) the ID-proof/offer-letter documents HR manages for them
// via the Super Admin Employee Profile's Documents tab.
export async function GET() {
  const session = await getSession();
  if (!session?.employeeId) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  try {
    return NextResponse.json({ documents: await getMyDocuments() });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.employeeId) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const form = await request.formData();
  const file = form.get("file");
  const title = form.get("title");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "A PDF file is required." }, { status: 400 });
  }
  if (typeof title !== "string" || title.trim().length === 0) {
    return NextResponse.json({ error: "A title is required." }, { status: 400 });
  }
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    return NextResponse.json({ error: "Only PDF files are accepted." }, { status: 400 });
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: "File is larger than 20MB." }, { status: 400 });
  }

  try {
    const doc = await addMyDocument(title.trim(), file);
    return NextResponse.json({ document: doc }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
