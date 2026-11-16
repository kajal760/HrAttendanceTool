import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { EmployeeOverview } from "@/types/hr";

// The parts of an EmployeeOverview the backend doesn't model yet - the
// lifecycle module's history/checklists/exit details, the profile photo,
// and the demo performance/task metrics. Kept in a JSON side file keyed by
// the backend employee id until those modules move to the backend; the
// core record (name, department, status, manager, ...) lives in PostgreSQL.

export const EXTRA_KEYS = [
  "photoUrl",
  "age",
  "performanceScore",
  "attendancePct",
  "tasks",
  "pendingRequests",
  "onboardingTasks",
  "lifecycleHistory",
  "exit",
  "probationStartDate",
  "confirmationStatus",
] as const satisfies readonly (keyof EmployeeOverview)[];

export type ExtraKey = (typeof EXTRA_KEYS)[number];
export type EmployeeExtras = Partial<Pick<EmployeeOverview, ExtraKey>>;

const DATA_DIR = path.join(process.cwd(), ".data");
const EXTRAS_PATH = path.join(DATA_DIR, "employee-extras.json");

export function isExtraKey(key: string): key is ExtraKey {
  return (EXTRA_KEYS as readonly string[]).includes(key);
}

export async function getAllExtras(): Promise<Record<string, EmployeeExtras>> {
  try {
    return JSON.parse(await readFile(EXTRAS_PATH, "utf8")) as Record<string, EmployeeExtras>;
  } catch {
    return {};
  }
}

export async function getExtras(id: string): Promise<EmployeeExtras> {
  return (await getAllExtras())[id] ?? {};
}

export async function patchExtras(id: string, patch: EmployeeExtras): Promise<EmployeeExtras> {
  const all = await getAllExtras();
  const updated = { ...all[id], ...patch };
  all[id] = updated;
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(EXTRAS_PATH, JSON.stringify(all, null, 2), "utf8");
  return updated;
}
