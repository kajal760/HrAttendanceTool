import { NextResponse } from "next/server";
import { addTask, getTask, getTasks } from "@/lib/hr/work-store";
import type { WorkTaskStatus } from "@/types/work";

export const dynamic = "force-dynamic";

const STATUSES: WorkTaskStatus[] = ["Pending", "Ongoing", "Completed"];

export async function GET() {
  return NextResponse.json({ tasks: await getTasks() });
}

// Only a manager/HR can create a task - the assignee(s) only ever get to
// write its `summary`/`mentionedIds` afterward (see
// `/api/employee/tasks/[id]/summary`).
export async function POST(request: Request) {
  const body = await request.json();
  const { title, description, projectId, assigneeIds, deadline, status, dependsOnTaskId } = body ?? {};

  if (typeof title !== "string" || title.trim().length === 0) {
    return NextResponse.json({ error: "Task title is required." }, { status: 400 });
  }
  if (typeof projectId !== "string" || projectId.trim().length === 0) {
    return NextResponse.json({ error: "A project is required." }, { status: 400 });
  }
  if (!Array.isArray(assigneeIds) || assigneeIds.length === 0 || !assigneeIds.every((id) => typeof id === "string")) {
    return NextResponse.json({ error: "Assign the task to at least one employee." }, { status: 400 });
  }
  if (typeof deadline !== "string" || Number.isNaN(Date.parse(deadline))) {
    return NextResponse.json({ error: "A valid deadline is required." }, { status: 400 });
  }
  if (status !== undefined && !STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }
  if (dependsOnTaskId !== undefined && dependsOnTaskId !== "" && dependsOnTaskId !== null) {
    if (typeof dependsOnTaskId !== "string" || !(await getTask(dependsOnTaskId))) {
      return NextResponse.json({ error: "The task it depends on was not found." }, { status: 400 });
    }
  }

  const task = await addTask({
    title: title.trim(),
    description: typeof description === "string" && description.trim() ? description.trim() : undefined,
    projectId,
    assigneeIds,
    deadline,
    status,
    dependsOnTaskId: dependsOnTaskId || undefined,
  });

  return NextResponse.json({ task }, { status: 201 });
}
