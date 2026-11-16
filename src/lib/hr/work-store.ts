import { backend, BackendError } from "@/lib/api/backend";
import type { ApiProject, ApiWorkTask } from "@/lib/api/types";
import { resolveRegistryId } from "@/lib/hr/org-registry-store";
import type { Project, WorkTask, WorkTaskStatus, WorkPriority } from "@/types/work";

// Backed by the FastAPI `/work/projects` and `/work/tasks` endpoints.

function toProject(p: ApiProject): Project {
  return {
    id: p.id,
    name: p.name,
    description: p.description ?? undefined,
    memberIds: p.memberIds,
    departmentName: p.departmentName ?? undefined,
    deadline: p.deadline ?? undefined,
    priority: (p.priority as WorkPriority) ?? "Medium",
    createdOn: p.createdOn,
    createdBy: p.createdBy,
  };
}

// The backend already resolves `projectName`/`dependsOnTask` server-side,
// but every existing consumer joins those itself from the plain `getTasks()`/
// `getProjects()` lists (see `src/lib/employee/task-dependencies.ts`), so
// those extra fields are just dropped here to keep the same `WorkTask` shape.
function toTask(t: ApiWorkTask): WorkTask {
  return {
    id: t.id,
    title: t.title,
    description: t.description ?? undefined,
    projectId: t.projectId,
    assigneeIds: t.assigneeIds,
    deadline: t.deadline,
    status: t.status,
    priority: (t.priority as WorkPriority) ?? "Medium",
    dependsOnTaskId: t.dependsOnTaskId ?? undefined,
    summary: t.summary ?? undefined,
    summaryUpdatedAt: t.summaryUpdatedAt ?? undefined,
    mentionedIds: t.mentionedIds,
    createdOn: t.createdOn,
    createdBy: t.createdBy,
    updatedAt: t.updatedAt,
  };
}

// --- Projects ---------------------------------------------------------------

export async function getProjects(): Promise<Project[]> {
  return (await backend<ApiProject[]>("/work/projects")).map(toProject);
}

export async function getProject(id: string): Promise<Project | null> {
  try {
    return toProject(await backend<ApiProject>(`/work/projects/${id}`));
  } catch (err) {
    if (err instanceof BackendError && err.status === 404) return null;
    throw err;
  }
}

export interface NewProjectInput {
  name: string;
  description?: string;
  memberIds: string[];
  deadline?: string;
  departmentName?: string;
  priority?: WorkPriority;
}

async function departmentId(departmentName: string | undefined): Promise<string | null | undefined> {
  if (departmentName === undefined) return undefined;
  if (!departmentName) return null;
  return resolveRegistryId("departments", departmentName);
}

export async function addProject(input: NewProjectInput): Promise<Project> {
  return toProject(
    await backend<ApiProject>("/work/projects", {
      method: "POST",
      body: {
        name: input.name,
        description: input.description,
        memberIds: input.memberIds,
        deadline: input.deadline,
        departmentId: await departmentId(input.departmentName),
        priority: input.priority,
      },
    }),
  );
}

export interface ProjectPatch {
  name?: string;
  description?: string;
  memberIds?: string[];
  deadline?: string;
  departmentName?: string;
  priority?: WorkPriority;
}

export async function patchProject(id: string, patch: ProjectPatch): Promise<Project | null> {
  const body: Record<string, unknown> = {
    name: patch.name,
    description: patch.description,
    memberIds: patch.memberIds,
    deadline: patch.deadline,
    priority: patch.priority,
  };
  if (patch.departmentName !== undefined) body.departmentId = await departmentId(patch.departmentName);
  try {
    return toProject(await backend<ApiProject>(`/work/projects/${id}`, { method: "PATCH", body }));
  } catch (err) {
    if (err instanceof BackendError && err.status === 404) return null;
    throw err;
  }
}

// --- Tasks -------------------------------------------------------------------

export async function getTasks(): Promise<WorkTask[]> {
  return (await backend<ApiWorkTask[]>("/work/tasks")).map(toTask);
}

export async function getTask(id: string): Promise<WorkTask | null> {
  try {
    return toTask(await backend<ApiWorkTask>(`/work/tasks/${id}`));
  } catch (err) {
    if (err instanceof BackendError && err.status === 404) return null;
    throw err;
  }
}

// Always the signed-in employee's own tasks - the backend takes the employee
// from the session token (`/work/tasks/me`), not the id passed here, which
// every call site already passes as its own.
export async function getTasksForEmployee(_employeeId: string): Promise<WorkTask[]> {
  return (await backend<ApiWorkTask[]>("/work/tasks/me")).map(toTask);
}

export async function getTasksForProject(projectId: string): Promise<WorkTask[]> {
  const tasks = await getTasks();
  return tasks.filter((t) => t.projectId === projectId);
}

export interface NewTaskInput {
  title: string;
  description?: string;
  projectId: string;
  assigneeIds: string[];
  deadline: string;
  status?: WorkTaskStatus;
  priority?: WorkPriority;
  dependsOnTaskId?: string;
}

export async function addTask(input: NewTaskInput): Promise<WorkTask> {
  return toTask(
    await backend<ApiWorkTask>("/work/tasks", {
      method: "POST",
      body: {
        title: input.title,
        description: input.description,
        projectId: input.projectId,
        assigneeIds: input.assigneeIds,
        deadline: input.deadline,
        status: input.status,
        priority: input.priority,
        dependsOnTaskId: input.dependsOnTaskId,
      },
    }),
  );
}

export interface TaskPatch {
  title?: string;
  description?: string;
  projectId?: string;
  assigneeIds?: string[];
  deadline?: string;
  status?: WorkTaskStatus;
  priority?: WorkPriority;
  dependsOnTaskId?: string | null;
}

export async function patchTask(id: string, patch: TaskPatch): Promise<WorkTask | null> {
  try {
    return toTask(await backend<ApiWorkTask>(`/work/tasks/${id}`, { method: "PATCH", body: patch }));
  } catch (err) {
    if (err instanceof BackendError && err.status === 404) return null;
    throw err;
  }
}

// The fields an employee can write on their own task - the backend 403s
// (surfaced as BackendError) unless they're actually one of its assignees.
export async function updateTaskSummary(
  id: string,
  _employeeId: string,
  summary: string,
  mentionedIds: string[] = [],
): Promise<WorkTask | null | "forbidden"> {
  try {
    return toTask(
      await backend<ApiWorkTask>(`/work/tasks/${id}/summary`, {
        method: "PATCH",
        body: { summary, mentionedIds },
      }),
    );
  } catch (err) {
    if (err instanceof BackendError && err.status === 404) return null;
    if (err instanceof BackendError && err.status === 403) return "forbidden";
    throw err;
  }
}
