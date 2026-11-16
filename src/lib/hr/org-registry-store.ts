import { backend, BackendError } from "@/lib/api/backend";
import type { ApiRegistryItem } from "@/lib/api/types";
import type { OrgRegistryItem, OrgRegistryResource } from "@/types/hr";

// Departments / designations / locations registry - backed by the FastAPI
// `/org/{resource}` endpoints. ("departments" is the same table the
// Departments module's `department-store.ts` manages.)

export async function getOrgRegistry(resource: OrgRegistryResource): Promise<OrgRegistryItem[]> {
  const items = await backend<ApiRegistryItem[]>(`/org/${resource}`);
  return items.map(({ id, name }) => ({ id, name }));
}

export async function addOrgRegistryItem(resource: OrgRegistryResource, name: string): Promise<OrgRegistryItem> {
  const item = await backend<ApiRegistryItem>(`/org/${resource}`, { method: "POST", body: { name } });
  return { id: item.id, name: item.name };
}

// Throws a 409 BackendError on a duplicate name (case-insensitive, like the
// backend's uniqueness check).
export async function patchOrgRegistryItem(
  resource: OrgRegistryResource,
  id: string,
  patch: { name: string },
): Promise<OrgRegistryItem> {
  const item = await backend<ApiRegistryItem>(`/org/${resource}/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: { name: patch.name },
  });
  return { id: item.id, name: item.name };
}

// Throws a 409 BackendError when employees still reference the item.
export async function deleteOrgRegistryItem(resource: OrgRegistryResource, id: string): Promise<boolean> {
  try {
    await backend(`/org/${resource}/${encodeURIComponent(id)}`, { method: "DELETE" });
    return true;
  } catch (err) {
    if (err instanceof BackendError && (err.status === 404 || err.status === 422)) return false;
    throw err;
  }
}

// Name -> id, including archived entries (an employee may still be filed
// under an archived department). Case-insensitive, like the backend's
// uniqueness check. The org structure forms itself from employee data: if no
// department/designation/location by this name exists yet, it's created here
// rather than requiring someone to have pre-declared it on the registry.
export async function resolveRegistryId(resource: OrgRegistryResource, name: string): Promise<string> {
  const trimmed = name.trim();
  const items = await backend<ApiRegistryItem[]>(`/org/${resource}`, { query: { include_archived: true } });
  const match = items.find((i) => i.name.toLowerCase() === trimmed.toLowerCase());
  if (match) return match.id;

  try {
    return (await addOrgRegistryItem(resource, trimmed)).id;
  } catch (err) {
    // Lost a race with another request creating the same name - use theirs.
    if (err instanceof BackendError && err.status === 409) {
      const retry = await backend<ApiRegistryItem[]>(`/org/${resource}`, { query: { include_archived: true } });
      const retryMatch = retry.find((i) => i.name.toLowerCase() === trimmed.toLowerCase());
      if (retryMatch) return retryMatch.id;
    }
    throw err;
  }
}
