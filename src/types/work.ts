// Work & Project Management - shared between the super admin (manager/HR)
// module, which creates and fully edits projects/tasks, and the employee
// self-service module, which only ever sees its own assigned tasks and can
// edit a single field on them (`summary`).

// Stored statuses only - "Overdue" is never persisted, it's derived from
// `deadline` vs. today (see `src/lib/work/status.ts`) so a task doesn't need
// a background job to flip it the moment its deadline passes.
export type WorkTaskStatus = "Pending" | "Ongoing" | "Completed";

export type WorkTaskDisplayStatus = WorkTaskStatus | "Overdue";

// A project's health, rolled up from its tasks (never stored - see
// `projectStatus()` in `src/lib/work/status.ts`): no tasks yet = Upcoming,
// every task Completed = Completed, any task Overdue = Delayed, otherwise
// Active.
export type ProjectRollupStatus = "Active" | "Completed" | "Upcoming" | "Delayed";

export interface Project {
  id: string;
  name: string;
  description?: string;
  memberIds: string[]; // employees assigned to this project
  departmentName?: string; // the department this project is run from
  deadline?: string; // YYYY-MM-DD, optional overall project deadline
  createdOn: string; // ISO
  createdBy: string; // placeholder until real auth exists
}

export interface WorkTask {
  id: string;
  title: string;
  description?: string;
  projectId: string;
  assigneeIds: string[]; // 1 = solo, 2+ = group task
  deadline: string; // YYYY-MM-DD
  status: WorkTaskStatus;
  // Manager/HR-set: another task (normally in the same project) that blocks
  // this one. A single link, not a dependency graph - see `patchTask`'s
  // validation for why cycles aren't detected.
  dependsOnTaskId?: string;
  // The fields an assignee can write themselves - everything else on a task
  // is manager/HR-only.
  summary?: string;
  summaryUpdatedAt?: string;
  mentionedIds?: string[]; // employees tagged in the latest summary update
  createdOn: string; // ISO
  createdBy: string;
  updatedAt: string; // ISO
}

// A task plus its project's name and (if set) its blocking task's title and
// status resolved in, for display contexts (the employee dashboard widget,
// the self-service task list) that don't also have the full project/task
// lists handy to join against.
export interface WorkTaskWithProject extends WorkTask {
  projectName: string;
  dependsOnTask?: { id: string; title: string; status: WorkTaskStatus };
}

export interface WorkTaskSummary {
  counts: Record<WorkTaskDisplayStatus, number>;
  recentTasks: WorkTaskWithProject[];
}
