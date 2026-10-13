import { NextResponse } from "next/server";
import { addDocument, getDocuments } from "@/lib/superadmin/document-store";
import { DOCUMENT_CATEGORIES, type DocumentCategory } from "@/types/documents";

export const dynamic = "force-dynamic";

const MAX_FILE_BYTES = 20 * 1024 * 1024; // 20MB

export async function GET() {
  return NextResponse.json({ documents: await getDocuments() });
}

// Uploaded from the Reports page's upload form. Only PDFs are accepted since
// that's what these company documents (leave policy, handbook, ...) are
// published as.
export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("file");
  const title = form.get("title");
  const category = form.get("category");
  const employeeId = form.get("employeeId");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "A PDF file is required." }, { status: 400 });
  }
  if (typeof title !== "string" || title.trim().length === 0) {
    return NextResponse.json({ error: "A title is required." }, { status: 400 });
  }
  if (typeof category !== "string" || !DOCUMENT_CATEGORIES.includes(category as DocumentCategory)) {
    return NextResponse.json({ error: "A valid category is required." }, { status: 400 });
  }
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    return NextResponse.json({ error: "Only PDF files are accepted." }, { status: 400 });
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: "File is larger than 20MB." }, { status: 400 });
  }

  const fileBytes = new Uint8Array(await file.arrayBuffer());
  const doc = await addDocument({
    title: title.trim(),
    category: category as DocumentCategory,
    fileName: file.name,
    fileBytes,
    // TODO: read from the authenticated session once auth exists.
    uploadedBy: "Super Admin",
    employeeId: typeof employeeId === "string" && employeeId.length > 0 ? employeeId : undefined,
  });

  return NextResponse.json({ document: doc }, { status: 201 });
}
