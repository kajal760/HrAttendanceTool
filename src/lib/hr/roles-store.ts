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
  { key: "createLogin", label: "Create HR / Employee login accounts" },
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

// Merges the saved matrix over fresh defaults (rather than returning the
// saved file as-is) so a feature added after the file was first saved - like
// this one - gets its role defaults instead of silently reading as
// unchecked for every role, including ones that should start enabled.
export async function getRolesMatrix(): Promise<RolePermissionsMatrix> {
  const defaults = defaultMatrix();
  try {
    const raw = await readFile(INDEX_PATH, "utf8");
    const saved = JSON.parse(raw) as RolePermissionsMatrix;
    return Object.fromEntries(
      ROLES.map((role) => [role, { ...defaults[role], ...saved[role] }]),
    ) as RolePermissionsMatrix;
  } catch {
    return defaults;
  }
}

export async function saveRolesMatrix(matrix: RolePermissionsMatrix): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(INDEX_PATH, JSON.stringify(matrix, null, 2), "utf8");
}
