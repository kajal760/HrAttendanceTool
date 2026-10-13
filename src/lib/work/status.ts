// Shared status helpers for Work & Project Management - used by both the
// super admin board and the employee task view so the two never disagree on
// what counts as "Overdue" or how full a task's progress bar looks.
import type { Project, ProjectRollupStatus, WorkTask, WorkTaskDisplayStatus, WorkTaskStatus } from "@/types/work";

export const STATUS_FILTERS: WorkTaskDisplayStatus[] = ["Pending", "Ongoing", "Completed", "Overdue"];

// A rough visual progress value per stored status - not independently
// editable, same convention as the old per-employee task counters.
export const STATUS_PROGRESS: Record<WorkTaskStatus, number> = {
  Pending: 10,
  Ongoing: 55,
  Completed: 100,
};

export function isOverdue(task: Pick<WorkTask, "status" | "deadline">): boolean {
  if (task.status === "Completed") return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(task.deadline) < today;
}

// A task's status badge reads "Overdue" once its deadline has passed,
// regardless of whether it's still Pending or already Ongoing - the
// underlying stored status is unchanged so a manager can still see (and
// change) what stage it was actually at.
export function displayStatus(task: Pick<WorkTask, "status" | "deadline">): WorkTaskDisplayStatus {
  return isOverdue(task) ? "Overdue" : task.status;
}

export function progressFor(task: Pick<WorkTask, "status">): number {
  return STATUS_PROGRESS[task.status];
}

// A project with no tasks yet hasn't started (Upcoming); once every task is
// Completed, so is the project; any Overdue task makes the whole project
// Delayed; anything else in between is Active.
export function projectStatus(project: Pick<Project, "id">, tasks: WorkTask[]): ProjectRollupStatus {
  const projectTasks = tasks.filter((t) => t.projectId === project.id);
  if (projectTasks.length === 0) return "Upcoming";
  if (projectTasks.every((t) => t.status === "Completed")) return "Completed";
  if (projectTasks.some((t) => isOverdue(t))) return "Delayed";
  return "Active";
}
