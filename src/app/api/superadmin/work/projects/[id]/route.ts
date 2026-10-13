import { NextResponse } from "next/server";
import { patchProject } from "@/lib/hr/work-store";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const { name, description, memberIds, deadline, departmentName } = body ?? {};

  const patch: Record<string, unknown> = {};
  if (name !== undefined) {
    if (typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "Project name cannot be empty." }, { status: 400 });
    }
    patch.name = name.trim();
  }
  if (description !== undefined) {
    patch.description = typeof description === "string" && description.trim() ? description.trim() : undefined;
  }
  if (memberIds !== undefined) {
    if (!Array.isArray(memberIds) || !memberIds.every((mid) => typeof mid === "string")) {
      return NextResponse.json({ error: "Invalid member list." }, { status: 400 });
    }
    patch.memberIds = memberIds;
  }
  if (deadline !== undefined) {
    if (deadline !== null && (typeof deadline !== "string" || Number.isNaN(Date.parse(deadline)))) {
      return NextResponse.json({ error: "Invalid deadline." }, { status: 400 });
    }
    patch.deadline = deadline || undefined;
  }

  if (departmentName !== undefined) {
    patch.departmentName = typeof departmentName === "string" && departmentName.trim() ? departmentName.trim() : undefined;
  }

  const project = await patchProject(id, patch);
  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }
  return NextResponse.json({ project });
}
