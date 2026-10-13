import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { OrgRegistryItem, OrgRegistryResource } from "@/types/hr";

// Same disk-backed JSON-index pattern as `employee-store.ts`/
// `document-store.ts` - one generic implementation parameterized by
// resource name instead of three near-identical stores.

const DATA_DIR = path.join(process.cwd(), ".data");

const SEEDS: Record<OrgRegistryResource, string[]> = {
  departments: ["Engineering", "Product", "Design", "Human Resources", "Sales", "Finance", "Marketing"],
  designations: [
    "Software Engineer",
    "Senior Software Engineer",
    "QA Engineer",
    "Product Manager",
    "UI/UX Designer",
    "HR Manager",
    "Sales Executive",
    "Financial Analyst",
    "Marketing Lead",
  ],
  locations: ["Bengaluru", "Mumbai", "Delhi NCR", "Remote"],
};

function indexPath(resource: OrgRegistryResource): string {
  return path.join(DATA_DIR, `org-${resource}.json`);
}

async function readList(resource: OrgRegistryResource): Promise<OrgRegistryItem[]> {
  try {
    const raw = await readFile(indexPath(resource), "utf8");
    return JSON.parse(raw) as OrgRegistryItem[];
  } catch {
    return SEEDS[resource].map((name, i) => ({ id: `${resource}-seed-${i}`, name }));
  }
}

async function writeList(resource: OrgRegistryResource, items: OrgRegistryItem[]): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(indexPath(resource), JSON.stringify(items, null, 2), "utf8");
}

export async function getOrgRegistry(resource: OrgRegistryResource): Promise<OrgRegistryItem[]> {
  return readList(resource);
}

export async function addOrgRegistryItem(
  resource: OrgRegistryResource,
  name: string,
): Promise<OrgRegistryItem> {
  const items = await readList(resource);
  const item: OrgRegistryItem = { id: `${resource}-${Date.now()}`, name };
  await writeList(resource, [...items, item]);
  return item;
}

export async function deleteOrgRegistryItem(resource: OrgRegistryResource, id: string): Promise<boolean> {
  const items = await readList(resource);
  const filtered = items.filter((i) => i.id !== id);
  if (filtered.length === items.length) return false;
  await writeList(resource, filtered);
  return true;
}
