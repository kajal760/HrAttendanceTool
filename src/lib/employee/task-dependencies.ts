import type { Project, WorkTask, WorkTaskWithProject } from "@/types/work";

// Resolves each task's project name and (if it has one) its blocking task's
// title/status - the blocker may belong to someone else entirely, so it's
// resolved against the full task list, not just the employee's own tasks.
export function resolveTasksWithProject(
  myTasks: WorkTask[],
  allTasks: WorkTask[],
  projects: Project[],
): WorkTaskWithProject[] {
  const projectsById = new Map(projects.map((p) => [p.id, p]));
  const tasksById = new Map(allTasks.map((t) => [t.id, t]));

  return myTasks.map((task) => {
    const blocker = task.dependsOnTaskId ? tasksById.get(task.dependsOnTaskId) : undefined;
    return {
      ...task,
      projectName: projectsById.get(task.projectId)?.name ?? "Unknown project",
      dependsOnTask: blocker ? { id: blocker.id, title: blocker.title, status: blocker.status } : undefined,
    };
  });
}

export interface BlockingEntry {
  myTask: WorkTask;
  waitingTask: WorkTask;
}

// The flip side of a dependency: other tasks that depend on one of *my*
// tasks, i.e. tasks I'm blocking.
export function findTasksBlockedByMine(myTasks: WorkTask[], allTasks: WorkTask[]): BlockingEntry[] {
  const myById = new Map(myTasks.map((t) => [t.id, t]));
  const entries: BlockingEntry[] = [];
  for (const task of allTasks) {
    const blocker = task.dependsOnTaskId ? myById.get(task.dependsOnTaskId) : undefined;
    if (blocker) entries.push({ myTask: blocker, waitingTask: task });
  }
  return entries;
}
