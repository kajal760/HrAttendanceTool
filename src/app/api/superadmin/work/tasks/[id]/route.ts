import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api/backend";
import { patchTask } from "@/lib/hr/work-store";
import type { WorkTaskStatus, WorkPriority } from "@/types/work";
import { WORK_PRIORITIES } from "@/types/work";

export const dynamic = "force-dynamic";

const STATUSES: WorkTaskStatus[] = ["Pending", "Ongoing", "Completed"];

// Manager/HR full edit - every field except `summary`/`mentionedIds`, which
// only the assignee(s) can write (see `/api/employee/tasks/[id]/summary`).
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const { title, description, projectId, assigneeIds, deadline, status, priority, dependsOnTaskId } = body ?? {};

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
  if (priority !== undefined) {
    if (!(WORK_PRIORITIES as string[]).includes(priority)) {
      return NextResponse.json({ error: "Invalid priority." }, { status: 400 });
    }
    patch.priority = priority as WorkPriority;
  }
  if (dependsOnTaskId !== undefined) {
    patch.dependsOnTaskId = dependsOnTaskId === null || dependsOnTaskId === "" ? null : dependsOnTaskId;
  }

  try {
    const task = await patchTask(id, patch);
    if (!task) {
      return NextResponse.json({ error: "Task not found." }, { status: 404 });
    }
    return NextResponse.json({ task });
  } catch (err) {
    return errorResponse(err);
  }
}
