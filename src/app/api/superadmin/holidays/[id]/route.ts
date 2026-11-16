import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api/backend";
import { deleteHoliday, patchHoliday } from "@/lib/hr/holidays";
import { getSession } from "@/lib/auth/get-session";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (session?.role !== "HR") {
    return NextResponse.json({ error: "Only HR can manage holidays." }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const date = typeof body?.date === "string" ? body.date : "";
  const type = body?.type === "Public" || body?.type === "Optional" ? body.type : null;
  if (!name || !date || !type) {
    return NextResponse.json({ error: "A name, date, and type are required." }, { status: 400 });
  }

  try {
    const holiday = await patchHoliday(id, { name, date, type });
    return NextResponse.json({ holiday });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (session?.role !== "HR") {
    return NextResponse.json({ error: "Only HR can manage holidays." }, { status: 403 });
  }

  const { id } = await params;
  try {
    const removed = await deleteHoliday(id);
    if (!removed) return NextResponse.json({ error: "Not found." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
