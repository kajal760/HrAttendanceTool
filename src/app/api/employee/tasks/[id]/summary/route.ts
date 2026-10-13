import { NextResponse } from "next/server";
import { updateTaskSummary } from "@/lib/hr/work-store";
import { getEmployeeOverviews } from "@/lib/hr/employee-store";
import { getSession } from "@/lib/auth/get-session";

export const dynamic = "force-dynamic";

// The only writes an employee can make to their own task - every other field
// is manager/HR-only (see `/api/superadmin/work/tasks/[id]`). `employeeId`
// comes from the session, not the request body, so one employee can't spoof
// another's id to write their task summary; the store still separately
// rejects the write if that id isn't actually an assignee.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session?.employeeId) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { summary, mentionedIds } = body ?? {};

  if (typeof summary !== "string") {
    return NextResponse.json({ error: "summary must be a string." }, { status: 400 });
  }

  // Silently drop any id that isn't a real employee rather than rejecting
  // the whole save - low-stakes field, no reason to lose a summary edit over
  // a stale mention.
  let cleanMentionedIds: string[] = [];
  if (mentionedIds !== undefined) {
    if (!Array.isArray(mentionedIds) || !mentionedIds.every((m) => typeof m === "string")) {
      return NextResponse.json({ error: "mentionedIds must be an array of strings." }, { status: 400 });
    }
    const employees = await getEmployeeOverviews();
    const validIds = new Set(employees.map((e) => e.id));
    cleanMentionedIds = mentionedIds.filter((m) => validIds.has(m));
  }

  const result = await updateTaskSummary(id, session.employeeId, summary.trim(), cleanMentionedIds);
  if (result === null) {
    return NextResponse.json({ error: "Task not found." }, { status: 404 });
  }
  if (result === "forbidden") {
    return NextResponse.json({ error: "Only an assignee can write this task's summary." }, { status: 403 });
  }
  return NextResponse.json({ task: result });
}
