import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api/backend";
import { addProject, getProjects } from "@/lib/hr/work-store";
import type { WorkPriority } from "@/types/work";
import { WORK_PRIORITIES } from "@/types/work";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json({ projects: await getProjects() });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(request: Request) {
  const body = await request.json();
  const { name, description, memberIds, deadline, departmentName, priority } = body ?? {};

  if (typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "Project name is required." }, { status: 400 });
  }
  if (!Array.isArray(memberIds) || !memberIds.every((id) => typeof id === "string")) {
    return NextResponse.json({ error: "Invalid member list." }, { status: 400 });
  }
  if (deadline !== undefined && (typeof deadline !== "string" || Number.isNaN(Date.parse(deadline)))) {
    return NextResponse.json({ error: "Invalid deadline." }, { status: 400 });
  }
  if (priority !== undefined && !(WORK_PRIORITIES as string[]).includes(priority)) {
    return NextResponse.json({ error: "Invalid priority." }, { status: 400 });
  }

  try {
    const project = await addProject({
      name: name.trim(),
      description: typeof description === "string" && description.trim() ? description.trim() : undefined,
      memberIds,
      deadline: typeof deadline === "string" && deadline ? deadline : undefined,
      departmentName: typeof departmentName === "string" && departmentName.trim() ? departmentName.trim() : undefined,
      priority: priority as WorkPriority | undefined,
    });
    return NextResponse.json({ project }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
