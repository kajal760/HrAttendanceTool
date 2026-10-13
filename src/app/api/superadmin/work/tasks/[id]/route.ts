import { NextResponse } from "next/server";
import { getTask, patchTask } from "@/lib/hr/work-store";
import type { WorkTaskStatus } from "@/types/work";

export const dynamic = "force-dynamic";

const STATUSES: WorkTaskStatus[] = ["Pending", "Ongoing", "Completed"];

// Manager/HR full edit - every field except `summary`/`mentionedIds`, which
// only the assignee(s) can write (see `/api/employee/tasks/[id]/summary`).
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const { title, description, projectId, assigneeIds, deadline, status, dependsOnTaskId } = body ?? {};

  const patch: Record<string, unknown> = {};
  if (title !== undefined) {
    if (typeof title !== "string" || title.trim().length === 0) {
      return NextResponse.json({ error: "Task title cannot be empty." }, { status: 400 });
    }
    patch.title = title.trim();
  }
  if (description !== undefined) {
    patch.description = typeof description === "string" && description.trim() ? description.trim() : undefined;
  }
  if (projectId !== undefined) {
    if (typeof projectId !== "string" || projectId.trim().length === 0) {
      return NextResponse.json({ error: "A project is required." }, { status: 400 });
    }
    patch.projectId = projectId;
  }
  if (assigneeIds !== undefined) {
    if (!Array.isArray(assigneeIds) || assigneeIds.length === 0 || !assigneeIds.every((aid) => typeof aid === "string")) {
      return NextResponse.json({ error: "Assign the task to at least one employee." }, { status: 400 });
    }
    patch.assigneeIds = assigneeIds;
  }
  if (deadline !== undefined) {
    if (typeof deadline !== "string" || Number.isNaN(Date.parse(deadline))) {
      return NextResponse.json({ error: "A valid deadline is required." }, { status: 400 });
    }
    patch.deadline = deadline;
  }
  if (status !== undefined) {
    if (!STATUSES.includes(status)) {
      return NextResponse.json({ error: "Invalid status." }, { status: 400 });
    }
    patch.status = status;
  }
  if (dependsOnTaskId !== undefined) {
    if (dependsOnTaskId === null || dependsOnTaskId === "") {
      patch.dependsOnTaskId = null;
    } else {
      if (typeof dependsOnTaskId !== "string" || dependsOnTaskId === id) {
        return NextResponse.json({ error: "A task cannot depend on itself." }, { status: 400 });
      }
      if (!(await getTask(dependsOnTaskId))) {
        return NextResponse.json({ error: "The task it depends on was not found." }, { status: 400 });
      }
      patch.dependsOnTaskId = dependsOnTaskId;
    }
  }

  const task = await patchTask(id, patch);
  if (!task) {
    return NextResponse.json({ error: "Task not found." }, { status: 404 });
  }
  return NextResponse.json({ task });
}
