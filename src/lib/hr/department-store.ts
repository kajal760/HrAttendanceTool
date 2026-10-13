import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Department } from "@/types/hr";
import { getEmployeeOverviews, patchEmployee } from "@/lib/hr/employee-store";

// Same disk-backed JSON-index pattern as `employee-store.ts` - Next's dev
// server (Turbopack) runs route handlers and page components in separate
// module instances, so a plain in-memory array written by one is invisible
// to the other.

const DATA_DIR = path.join(process.cwd(), ".data");
const INDEX_PATH = path.join(DATA_DIR, "departments.json");

const SEED_NAMES = ["Engineering", "Product", "Design", "Human Resources", "Sales", "Finance", "Marketing"];

function seedDepartments(): Department[] {
  const now = new Date().toISOString();
  return SEED_NAMES.map((name, i) => ({
    id: `dept-seed-${i}`,
    name,
    archived: false,
    headId: null,
    createdOn: now,
  }));
}

async function readIndex(): Promise<Department[]> {
  try {
    const raw = await readFile(INDEX_PATH, "utf8");
    return JSON.parse(raw) as Department[];
  } catch {
    return seedDepartments();
  }
}

async function writeIndex(list: Department[]): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(INDEX_PATH, JSON.stringify(list, null, 2), "utf8");
}

export async function getDepartments(): Promise<Department[]> {
  return readIndex();
}

export async function getDepartment(id: string): Promise<Department | null> {
  const list = await readIndex();
  return list.find((d) => d.id === id) ?? null;
}

function isDuplicateName(list: Department[], name: string, excludeId?: string): boolean {
  const lower = name.trim().toLowerCase();
  return list.some((d) => d.id !== excludeId && d.name.trim().toLowerCase() === lower);
}

export interface NewDepartmentInput {
  name: string;
  description?: string;
  headId?: string | null;
}

export async function addDepartment(
  input: NewDepartmentInput,
): Promise<Department | { error: string }> {
  const list = await readIndex();
  const name = input.name.trim();
  if (!name) return { error: "A department name is required." };
  if (isDuplicateName(list, name)) return { error: "A department with that name already exists." };

  const department: Department = {
    id: `dept-${Date.now()}`,
    name,
    description: input.description?.trim() || undefined,
    headId: input.headId ?? null,
    archived: false,
    createdOn: new Date().toISOString(),
  };
  await writeIndex([department, ...list]);
  return department;
}

export interface DepartmentPatch {
  name?: string;
  description?: string;
  headId?: string | null;
  archived?: boolean;
}

// The one write primitive for department edits (rename, re-describe,
// reassign head, archive/reactivate). Renaming cascades to every employee
// currently filed under the old name, sequentially - `patchEmployee` does
// its own read-modify-write of the employee index, so firing several at
// once would race and drop all but the last write.
export async function patchDepartment(
  id: string,
  patch: DepartmentPatch,
): Promise<Department | { error: string } | null> {
  const list = await readIndex();
  const index = list.findIndex((d) => d.id === id);
  if (index === -1) return null;
  const current = list[index];

  let nextName = current.name;
  if (patch.name !== undefined) {
    const trimmed = patch.name.trim();
    if (!trimmed) return { error: "Department name cannot be empty." };
    if (isDuplicateName(list, trimmed, id)) return { error: "A department with that name already exists." };
    nextName = trimmed;
  }

  const updated: Department = {
    ...current,
    name: nextName,
    description: patch.description !== undefined ? patch.description.trim() || undefined : current.description,
    headId: patch.headId !== undefined ? patch.headId : current.headId,
    archived: patch.archived !== undefined ? patch.archived : current.archived,
  };
  list[index] = updated;
  await writeIndex(list);

  if (nextName !== current.name) {
    const employees = await getEmployeeOverviews();
    const affected = employees.filter((e) => e.department === current.name);
    for (const employee of affected) {
      await patchEmployee(employee.id, { department: nextName });
    }
  }

  // Assigning a head makes them the default manager of the department's
  // members who have no manager yet, or were managed by the previous head.
  if (updated.headId && updated.headId !== current.headId) {
    const employees = await getEmployeeOverviews();
    const members = employees.filter((e) => e.department === nextName && e.id !== updated.headId);
    for (const member of members) {
      if (!member.managerId || member.managerId === current.headId) {
        await patchEmployee(member.id, { managerId: updated.headId });
      }
    }
  }

  return updated;
}

// Refuses to delete while employees are still filed under the department -
// membership is matched by name, so removing the record would silently
// orphan them. Move or archive the members first.
export async function deleteDepartment(id: string): Promise<"deleted" | "not-found" | "has-members"> {
  const list = await readIndex();
  const target = list.find((d) => d.id === id);
  if (!target) return "not-found";
  const employees = await getEmployeeOverviews();
  if (employees.some((e) => e.department === target.name)) return "has-members";
  await writeIndex(list.filter((d) => d.id !== id));
  return "deleted";
}

// Every department name the app should offer - registry departments plus any
// name an employee is already filed under - so filters never miss one.
export async function getDepartmentNames(): Promise<{ names: string[]; activeNames: string[] }> {
  const [list, employees] = await Promise.all([readIndex(), getEmployeeOverviews()]);
  const names = new Set<string>(list.map((d) => d.name));
  for (const e of employees) names.add(e.department);
  const activeNames = new Set<string>(list.filter((d) => !d.archived).map((d) => d.name));
  return {
    names: Array.from(names).sort(),
    activeNames: Array.from(activeNames).sort(),
  };
}

// The head of a department is the default manager for anyone who joins or
// moves into it. Looked up by name, same as membership.
export async function getActiveDepartmentHeadId(name: string): Promise<string | null> {
  const list = await readIndex();
  const match = list.find((d) => !d.archived && d.name === name);
  return match?.headId ?? null;
}
