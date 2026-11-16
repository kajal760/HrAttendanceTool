import { backend, BackendError } from "@/lib/api/backend";
import type { ApiDepartment, ApiDepartmentArchiveImpact } from "@/lib/api/types";
import type { Department } from "@/types/hr";
import { getEmployeeOverviews, patchEmployee } from "@/lib/hr/employee-store";

// Departments - backed by the FastAPI `/org/departments` endpoints.
// Employees reference a department by id on the backend, so a rename no
// longer has to be cascaded to each employee record.

function toDepartment(d: ApiDepartment): Department {
  return {
    id: d.id,
    name: d.name,
    description: d.description ?? undefined,
    headId: d.headId,
    archived: d.archived,
    archivedAt: d.archivedAt,
    createdOn: d.createdAt,
  };
}

export async function getDepartments(): Promise<Department[]> {
  const list = await backend<ApiDepartment[]>("/org/departments", { query: { include_archived: true } });
  return list.map(toDepartment);
}

export async function getDepartment(id: string): Promise<Department | null> {
  const list = await getDepartments();
  return list.find((d) => d.id === id) ?? null;
}

export interface NewDepartmentInput {
  name: string;
  description?: string;
  headId?: string | null;
}

function asError(err: unknown): { error: string } {
  if (err instanceof BackendError && err.status < 500) return { error: err.detail };
  throw err;
}

export async function addDepartment(input: NewDepartmentInput): Promise<Department | { error: string }> {
  const name = input.name.trim();
  if (!name) return { error: "A department name is required." };
  try {
    const created = await backend<ApiDepartment>("/org/departments", {
      method: "POST",
      body: { name, description: input.description?.trim() || null, headId: input.headId ?? null },
    });
    return toDepartment(created);
  } catch (err) {
    return asError(err);
  }
}

export interface DepartmentPatch {
  name?: string;
  description?: string;
  headId?: string | null;
}

// The one write primitive for department edits - rename, re-describe,
// reassign head. Archive/reactivate go through their own endpoints below
// (the backend's `DepartmentUpdate` schema has no `archived` field at all,
// so it can keep `archivedAt` - and the 7-day restore window - in sync).
export async function patchDepartment(
  id: string,
  patch: DepartmentPatch,
): Promise<Department | { error: string } | null> {
  const current = await getDepartment(id);
  if (!current) return null;

  const body: Record<string, unknown> = {};
  if (patch.name !== undefined) {
    const trimmed = patch.name.trim();
    if (!trimmed) return { error: "Department name cannot be empty." };
    body.name = trimmed;
  }
  if (patch.description !== undefined) body.description = patch.description.trim() || null;
  if (patch.headId !== undefined) body.headId = patch.headId;

  let updated: Department;
  try {
    updated = toDepartment(
      await backend<ApiDepartment>(`/org/departments/${id}`, { method: "PATCH", body }),
    );
  } catch (err) {
    return asError(err);
  }

  // Assigning a head makes them the default manager of the department's
  // members who have no manager yet, or were managed by the previous head.
  // Sequential, so each patch sees the previous one's result.
  if (updated.headId && updated.headId !== current.headId) {
    const employees = await getEmployeeOverviews();
    const members = employees.filter((e) => e.department === updated.name && e.id !== updated.headId);
    for (const member of members) {
      if (!member.managerId || member.managerId === current.headId) {
        await patchEmployee(member.id, { managerId: updated.headId });
      }
    }
  }

  return updated;
}

// The backend refuses to delete a department employees are still filed
// under - move or archive the members first.
export async function deleteDepartment(id: string): Promise<"deleted" | "not-found" | "has-members"> {
  try {
    await backend(`/org/departments/${id}`, { method: "DELETE" });
    return "deleted";
  } catch (err) {
    if (err instanceof BackendError && (err.status === 404 || err.status === 422)) return "not-found";
    if (err instanceof BackendError && err.status === 409) return "has-members";
    throw err;
  }
}

// Active employee count for the archive confirmation dialog.
export async function getDepartmentArchiveImpact(id: string): Promise<{ employeeCount: number }> {
  const impact = await backend<ApiDepartmentArchiveImpact>(`/org/departments/${id}/archive-impact`);
  return { employeeCount: impact.employeeCount };
}

// 409s if already archived.
export async function archiveDepartment(id: string): Promise<Department | { error: string }> {
  try {
    return toDepartment(await backend<ApiDepartment>(`/org/departments/${id}/archive`, { method: "POST" }));
  } catch (err) {
    return asError(err);
  }
}

// 409s if not archived, or if the 7-day restore window has passed.
export async function restoreDepartment(id: string): Promise<Department | { error: string }> {
  try {
    return toDepartment(await backend<ApiDepartment>(`/org/departments/${id}/restore`, { method: "POST" }));
  } catch (err) {
    return asError(err);
  }
}

// Every department name the app should offer - registry departments plus any
// name an employee is already filed under - so filters never miss one.
export async function getDepartmentNames(): Promise<{ names: string[]; activeNames: string[] }> {
  const [list, employees] = await Promise.all([getDepartments(), getEmployeeOverviews()]);
  const names = new Set<string>(list.map((d) => d.name));
  for (const e of employees) if (e.department) names.add(e.department);
  const activeNames = new Set<string>(list.filter((d) => !d.archived).map((d) => d.name));
  return {
    names: Array.from(names).sort(),
    activeNames: Array.from(activeNames).sort(),
  };
}

// The head of a department is the default manager for anyone who joins or
// moves into it. Looked up by name.
export async function getActiveDepartmentHeadId(name: string): Promise<string | null> {
  const list = await getDepartments();
  const match = list.find((d) => !d.archived && d.name === name);
  return match?.headId ?? null;
}
