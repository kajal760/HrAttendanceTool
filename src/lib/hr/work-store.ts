import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Project, WorkTask, WorkTaskStatus } from "@/types/work";

// File-backed JSON store, same convention as `employee-store.ts`: Next's dev
// server (Turbopack) runs route handlers and page components in separate
// module instances, so a plain in-memory array written by one is invisible
// to the other - reading from disk each time sidesteps that.

const DATA_DIR = path.join(process.cwd(), ".data");
const PROJECTS_PATH = path.join(DATA_DIR, "projects.json");
const TASKS_PATH = path.join(DATA_DIR, "tasks.json");

const PERFORMED_BY = "Super Admin"; // TODO: read from the session once auth exists.

function daysFromNow(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

const SEED_PROJECTS: Project[] = [
  {
    id: "proj-1",
    name: "HR Attendance Portal",
    description: "The attendance, leave, and self-service platform itself.",
    memberIds: ["emp-1024", "emp-1032", "emp-1045", "emp-1051"],
    deadline: daysFromNow(45),
    createdOn: daysFromNow(-60),
    createdBy: PERFORMED_BY,
  },
  {
    id: "proj-2",
    name: "Internal Tools",
    description: "Dashboards and utilities used by the engineering team.",
    memberIds: ["emp-1032", "emp-1051", "emp-1067"],
    deadline: daysFromNow(30),
    createdOn: daysFromNow(-40),
    createdBy: PERFORMED_BY,
  },
];

const SEED_TASKS: WorkTask[] = [
  {
    id: "task-1",
    title: "Attendance report export (CSV)",
    description: "Let HR export a date-ranged attendance report as CSV.",
    projectId: "proj-1",
    assigneeIds: ["emp-1024"],
    deadline: daysFromNow(5),
    status: "Ongoing",
    summary: "CSV export endpoint drafted; wiring up date-range filter and testing large exports next.",
    summaryUpdatedAt: daysFromNow(-2),
    createdOn: daysFromNow(-12),
    createdBy: PERFORMED_BY,
    updatedAt: daysFromNow(-2),
  },
  {
    id: "task-2",
    title: "Leave approval email templates",
    projectId: "proj-1",
    assigneeIds: ["emp-1024", "emp-1045"],
    deadline: daysFromNow(9),
    status: "Pending",
    createdOn: daysFromNow(-8),
    createdBy: PERFORMED_BY,
    updatedAt: daysFromNow(-8),
  },
  {
    id: "task-3",
    title: "Fix geolocation permission fallback",
    description: "Denied-permission edge case on iOS Safari falls back to manual entry.",
    projectId: "proj-1",
    assigneeIds: ["emp-1024"],
    deadline: daysFromNow(-2),
    status: "Ongoing",
    summary: "Blocked on device testing for the denied-permission edge case on iOS Safari.",
    summaryUpdatedAt: daysFromNow(-5),
    createdOn: daysFromNow(-10),
    createdBy: PERFORMED_BY,
    updatedAt: daysFromNow(-5),
  },
  {
    id: "task-4",
    title: "Sprint 12 code review",
    projectId: "proj-2",
    assigneeIds: ["emp-1024", "emp-1032"],
    deadline: daysFromNow(-10),
    status: "Completed",
    summary: "All review comments resolved and merged to main.",
    summaryUpdatedAt: daysFromNow(-10),
    createdOn: daysFromNow(-16),
    createdBy: PERFORMED_BY,
    updatedAt: daysFromNow(-10),
  },
  {
    id: "task-5",
    title: "Design leave-balance API contract",
    projectId: "proj-1",
    assigneeIds: ["emp-1032"],
    deadline: daysFromNow(-14),
    status: "Completed",
    summary: "Contract finalized and shared with the frontend team.",
    summaryUpdatedAt: daysFromNow(-14),
    createdOn: daysFromNow(-20),
    createdBy: PERFORMED_BY,
    updatedAt: daysFromNow(-14),
  },
  {
    id: "task-6",
    title: "Task dependency graph UI",
    projectId: "proj-1",
    assigneeIds: ["emp-1045", "emp-1051"],
    deadline: daysFromNow(12),
    status: "Pending",
    createdOn: daysFromNow(-6),
    createdBy: PERFORMED_BY,
    updatedAt: daysFromNow(-6),
  },
  {
    id: "task-7",
    title: "Quarterly attendance analytics dashboard",
    projectId: "proj-2",
    assigneeIds: ["emp-1051"],
    deadline: daysFromNow(14),
    status: "Ongoing",
    summary: "Charting library evaluated; building the filter panel this week.",
    summaryUpdatedAt: daysFromNow(-3),
    createdOn: daysFromNow(-18),
    createdBy: PERFORMED_BY,
    updatedAt: daysFromNow(-3),
  },
  {
    id: "task-8",
    title: "Update onboarding checklist copy",
    projectId: "proj-1",
    assigneeIds: ["emp-1045"],
    deadline: daysFromNow(-1),
    status: "Pending",
    createdOn: daysFromNow(-9),
    createdBy: PERFORMED_BY,
    updatedAt: daysFromNow(-9),
  },
];

async function readJson<T>(filePath: string, seed: T): Promise<T> {
  try {
    const raw = await readFile(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return seed;
  }
}

async function writeJson<T>(filePath: string, data: T): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(filePath, JSON.stringify(data, null, 2), "utf8");
}

function newId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.round(Math.random() * 1e6)}`;
}

// --- Projects ---------------------------------------------------------------

export async function getProjects(): Promise<Project[]> {
  return readJson(PROJECTS_PATH, SEED_PROJECTS);
}

export async function getProject(id: string): Promise<Project | null> {
  const list = await getProjects();
  return list.find((p) => p.id === id) ?? null;
}

export interface NewProjectInput {
  name: string;
  description?: string;
  memberIds: string[];
  deadline?: string;
  departmentName?: string;
}

export async function addProject(input: NewProjectInput): Promise<Project> {
  const project: Project = {
    id: newId("proj"),
    name: input.name,
    description: input.description,
    memberIds: input.memberIds,
    deadline: input.deadline,
    departmentName: input.departmentName,
    createdOn: new Date().toISOString(),
    createdBy: PERFORMED_BY,
  };
  const list = await getProjects();
  await writeJson(PROJECTS_PATH, [project, ...list]);
  return project;
}

export interface ProjectPatch {
  name?: string;
  description?: string;
  memberIds?: string[];
  deadline?: string;
  departmentName?: string;
}

export async function patchProject(id: string, patch: ProjectPatch): Promise<Project | null> {
  const list = await getProjects();
  const index = list.findIndex((p) => p.id === id);
  if (index === -1) return null;
  const updated: Project = { ...list[index], ...patch };
  list[index] = updated;
  await writeJson(PROJECTS_PATH, list);
  return updated;
}

// --- Tasks -------------------------------------------------------------------

export async function getTasks(): Promise<WorkTask[]> {
  return readJson(TASKS_PATH, SEED_TASKS);
}

export async function getTask(id: string): Promise<WorkTask | null> {
  const list = await getTasks();
  return list.find((t) => t.id === id) ?? null;
}

export async function getTasksForEmployee(employeeId: string): Promise<WorkTask[]> {
  const list = await getTasks();
  return list.filter((t) => t.assigneeIds.includes(employeeId));
}

export async function getTasksForProject(projectId: string): Promise<WorkTask[]> {
  const list = await getTasks();
  return list.filter((t) => t.projectId === projectId);
}

export interface NewTaskInput {
  title: string;
  description?: string;
  projectId: string;
  assigneeIds: string[];
  deadline: string;
  status?: WorkTaskStatus;
  dependsOnTaskId?: string;
}

// Every new task a manager/HR creates starts life owned entirely by them -
// the only fields an assignee can ever write are `summary`/`mentionedIds`
// (see `updateTaskSummary`), enforced at the API layer, not here.
export async function addTask(input: NewTaskInput): Promise<WorkTask> {
  const now = new Date().toISOString();
  const task: WorkTask = {
    id: newId("task"),
    title: input.title,
    description: input.description,
    projectId: input.projectId,
    assigneeIds: input.assigneeIds,
    deadline: input.deadline,
    status: input.status ?? "Pending",
    dependsOnTaskId: input.dependsOnTaskId,
    createdOn: now,
    createdBy: PERFORMED_BY,
    updatedAt: now,
  };
  const list = await getTasks();
  await writeJson(TASKS_PATH, [task, ...list]);
  return task;
}

export interface TaskPatch {
  title?: string;
  description?: string;
  projectId?: string;
  assigneeIds?: string[];
  deadline?: string;
  status?: WorkTaskStatus;
  dependsOnTaskId?: string | null;
}

// The manager/HR write path - can touch every field except
// `summary`/`mentionedIds`.
export async function patchTask(id: string, patch: TaskPatch): Promise<WorkTask | null> {
  const list = await getTasks();
  const index = list.findIndex((t) => t.id === id);
  if (index === -1) return null;
  const { dependsOnTaskId, ...rest } = patch;
  const updated: WorkTask = {
    ...list[index],
    ...rest,
    ...(dependsOnTaskId !== undefined ? { dependsOnTaskId: dependsOnTaskId ?? undefined } : {}),
    updatedAt: new Date().toISOString(),
  };
  list[index] = updated;
  await writeJson(TASKS_PATH, list);
  return updated;
}

// The fields an employee can write on their own task - rejected unless
// they're actually one of its assignees.
export async function updateTaskSummary(
  id: string,
  employeeId: string,
  summary: string,
  mentionedIds: string[] = [],
): Promise<WorkTask | null | "forbidden"> {
  const list = await getTasks();
  const index = list.findIndex((t) => t.id === id);
  if (index === -1) return null;
  if (!list[index].assigneeIds.includes(employeeId)) return "forbidden";
  const now = new Date().toISOString();
  const updated: WorkTask = { ...list[index], summary, mentionedIds, summaryUpdatedAt: now, updatedAt: now };
  list[index] = updated;
  await writeJson(TASKS_PATH, list);
  return updated;
}
