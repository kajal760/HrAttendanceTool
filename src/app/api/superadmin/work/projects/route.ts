import { NextResponse } from "next/server";
import { addProject, getProjects } from "@/lib/hr/work-store";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ projects: await getProjects() });
}

export async function POST(request: Request) {
  const body = await request.json();
  const { name, description, memberIds, deadline, departmentName } = body ?? {};

  if (typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "Project name is required." }, { status: 400 });
  }
  if (!Array.isArray(memberIds) || !memberIds.every((id) => typeof id === "string")) {
    return NextResponse.json({ error: "Invalid member list." }, { status: 400 });
  }
  if (deadline !== undefined && (typeof deadline !== "string" || Number.isNaN(Date.parse(deadline)))) {
    return NextResponse.json({ error: "Invalid deadline." }, { status: 400 });
  }

  const project = await addProject({
    name: name.trim(),
    description: typeof description === "string" && description.trim() ? description.trim() : undefined,
    memberIds,
    deadline: typeof deadline === "string" && deadline ? deadline : undefined,
    departmentName: typeof departmentName === "string" && departmentName.trim() ? departmentName.trim() : undefined,
  });

  return NextResponse.json({ project }, { status: 201 });
}
