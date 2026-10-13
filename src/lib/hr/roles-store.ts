import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { RoleFeature, RoleName, RolePermissionsMatrix } from "@/types/hr";

// A reference matrix an admin can edit - NOT enforced anywhere (there's no
// auth/session system in this app to enforce it against). Same disk-backed
// JSON pattern as the other stores, but a single document rather than a
// list since there's only ever one matrix.

const DATA_DIR = path.join(process.cwd(), ".data");
const INDEX_PATH = path.join(DATA_DIR, "roles.json");

export const ROLES: RoleName[] = ["HR", "Admin", "Manager", "Employee"];

export const FEATURES: RoleFeature[] = [
  { key: "viewEmployees", label: "View all employees" },
  { key: "editEmployeeProfile", label: "Edit employee profiles" },
  { key: "addEmployee", label: "Add employee / bulk import" },
  { key: "manageLifecycle", label: "Transfer / promote / separation actions" },
  { key: "manageOrgStructure", label: "Manage departments & designations" },
  { key: "manageDocuments", label: "Upload company documents" },
  { key: "viewReports", label: "View reports" },
  { key: "manageRoles", label: "Edit roles & permissions" },
];

function defaultMatrix(): RolePermissionsMatrix {
  const allTrue = Object.fromEntries(FEATURES.map((f) => [f.key, true]));
  const viewOnly = Object.fromEntries(FEATURES.map((f) => [f.key, f.key === "viewEmployees"]));
  const managerDefaults = Object.fromEntries(
    FEATURES.map((f) => [f.key, f.key === "viewEmployees" || f.key === "manageLifecycle"]),
  );
  return {
    HR: allTrue,
    Admin: allTrue,
    Manager: managerDefaults,
    Employee: viewOnly,
  };
}

export async function getRolesMatrix(): Promise<RolePermissionsMatrix> {
  try {
    const raw = await readFile(INDEX_PATH, "utf8");
    return JSON.parse(raw) as RolePermissionsMatrix;
  } catch {
    return defaultMatrix();
  }
}

export async function saveRolesMatrix(matrix: RolePermissionsMatrix): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(INDEX_PATH, JSON.stringify(matrix, null, 2), "utf8");
}
