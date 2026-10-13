import { NextResponse } from "next/server";
import { deleteDepartment, getDepartment, patchDepartment } from "@/lib/hr/department-store";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const department = await getDepartment(id);
  if (!department) {
    return NextResponse.json({ error: "Department not found." }, { status: 404 });
  }
  return NextResponse.json({ department });
}

// Edits (rename/re-describe), head reassignment, and archive/reactivate all
// go through this one PATCH - same "one write primitive" convention as the
// employee lifecycle route.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const { name, description, headId, archived } = body ?? {};

  const patch: Record<string, unknown> = {};
  if (name !== undefined) patch.name = String(name);
  if (description !== undefined) patch.description = String(description);
  if (headId !== undefined) patch.headId = headId === null ? null : String(headId);
  if (archived !== undefined) patch.archived = Boolean(archived);

  const result = await patchDepartment(id, patch);
  if (result === null) {
    return NextResponse.json({ error: "Department not found." }, { status: 404 });
  }
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ department: result });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await deleteDepartment(id);
  if (result === "not-found") {
    return NextResponse.json({ error: "Department not found." }, { status: 404 });
  }
  if (result === "has-members") {
    return NextResponse.json(
      { error: "Move or archive this department's employees before deleting it." },
      { status: 409 },
    );
  }
  return NextResponse.json({ ok: true });
}
