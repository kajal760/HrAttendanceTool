import { NextResponse } from "next/server";
import { backendRaw, errorResponse } from "@/lib/api/backend";
import { uploadCertificate } from "@/lib/hr/training-store";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const res = await backendRaw(`/training/assignments/${id}/certificate`);
    return new NextResponse(res.body, {
      status: res.status,
      headers: {
        "Content-Type": res.headers.get("Content-Type") ?? "application/octet-stream",
        "Content-Disposition": res.headers.get("Content-Disposition") ?? "attachment",
      },
    });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Attach a certificate file." }, { status: 400 });
  }
  try {
    const assignment = await uploadCertificate(id, file);
    return NextResponse.json({ assignment });
  } catch (err) {
    return errorResponse(err);
  }
}
