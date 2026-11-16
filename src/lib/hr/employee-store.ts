import { cache } from "react";
import { backend } from "@/lib/api/backend";
import type { ApiEmployee, ApiEmployeeSummary, ApiLeaveSummary, ApiLeaveTotals, ApiPage } from "@/lib/api/types";
import { getSession } from "@/lib/auth/get-session";
import { resolveRegistryId } from "@/lib/hr/org-registry-store";
import {
  getAllExtras,
  getExtras,
  isExtraKey,
  patchExtras,
  type EmployeeExtras,
} from "@/lib/hr/employee-extras-store";
import type {
  EducationRecord,
  EmployeeCustomField,
  EmployeeOverview,
  EmployeeStatus,
  ExitChecklistItem,
  ExperienceRecord,
  LifecycleEvent,
} from "@/types/hr";

// Employee Master - the core record lives in the FastAPI backend
// (PostgreSQL); lifecycle extras the backend doesn't model yet live in
// `employee-extras-store.ts`. Exported functions keep their original
// signatures, so pages and routes didn't change when the JSON index was
// replaced.
//
// Visibility follows the backend's `/employees/directory`: Admin/HR see
// everyone (incl. deactivated, with salary); an Employee sees active
// colleagues without their private contact details.

const DEFAULT_ONBOARDING_TASKS = [
  "Employee profile completed",
  "Documents submitted",
  "Company policies accepted",
  "Email/account created",
  "Laptop/device assigned",
  "Access card assigned",
  "Department assigned",
  "Reporting manager assigned",
  "Initial project/task assigned",
];

// Four groups the Separation tab's exit checklist is organized into -
// matches the Lifecycle module spec exactly. Built fresh (not shared) per
// employee since each item's status is independently tracked.
const EXIT_CHECKLIST_TEMPLATE: { category: ExitChecklistItem["category"]; label: string }[] = [
  { category: "Handover", label: "Project handover" },
  { category: "Handover", label: "Task handover" },
  { category: "Handover", label: "Knowledge transfer" },
  { category: "Assets", label: "Laptop returned" },
  { category: "Assets", label: "Phone returned" },
  { category: "Assets", label: "ID card returned" },
  { category: "Assets", label: "Access card returned" },
  { category: "Assets", label: "Other assets returned" },
  { category: "Access", label: "Email access" },
  { category: "Access", label: "Application access" },
  { category: "Access", label: "VPN access" },
  { category: "Access", label: "System access" },
  { category: "HR", label: "Exit interview" },
  { category: "HR", label: "Experience/relieving documents" },
  { category: "HR", label: "Full & Final settlement" },
];

export function buildExitChecklist(): ExitChecklistItem[] {
  return EXIT_CHECKLIST_TEMPLATE.map((item, i) => ({
    id: `exit-item-${i}`,
    category: item.category,
    label: item.label,
    status: "Pending" as const,
  }));
}

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

function ageFrom(dateOfBirth: string | null, fallback: number | undefined): number {
  if (!dateOfBirth) return fallback ?? 0;
  const dob = new Date(`${dateOfBirth}T00:00:00`);
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  if (now.getMonth() < dob.getMonth() || (now.getMonth() === dob.getMonth() && now.getDate() < dob.getDate())) age--;
  return age;
}

function addMonths(dateStr: string, months: number): string {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

function newEventId(): string {
  return `evt-${Date.now()}-${Math.round(Math.random() * 1e6)}`;
}

const undef = <T,>(v: T | null): T | undefined => (v === null ? undefined : v);

function toOverview(
  e: ApiEmployee,
  extras: EmployeeExtras,
  leave: { remaining: number; allocated: number },
): EmployeeOverview {
  return {
    id: e.id,
    employeeCode: e.employeeCode,
    name: e.name,
    initials: initialsFor(e.name),
    photoUrl: extras.photoUrl,
    email: e.email,
    department: e.department ?? "",
    designation: e.designation ?? "",
    status: e.status,
    joinedOn: e.joinedOn,
    age: ageFrom(e.dateOfBirth, extras.age),
    salary: e.salary ?? 0,
    performanceScore: extras.performanceScore ?? 0,
    attendancePct: extras.attendancePct ?? 0,
    leave,
    tasks: extras.tasks ?? { completed: 0, active: 0, completionPct: 0 },
    pendingRequests: extras.pendingRequests ?? 0,
    phone: undef(e.phone),
    personalEmail: undef(e.personalEmail),
    dateOfBirth: undef(e.dateOfBirth),
    gender: undef(e.gender),
    maritalStatus: undef(e.maritalStatus),
    currentAddress: undef(e.currentAddress),
    permanentAddress: undef(e.permanentAddress),
    emergencyContact: undef(e.emergencyContact),
    education: e.education as unknown as EducationRecord[],
    experience: e.experience as unknown as ExperienceRecord[],
    managerId: e.managerId,
    location: undef(e.location),
    workType: undef(e.workType),
    employmentType: undef(e.employmentType),
    grade: undef(e.grade),
    skills: e.skills,
    onboardingTasks: extras.onboardingTasks ?? [],
    lifecycleHistory: extras.lifecycleHistory ?? [],
    deactivated: e.deactivated,
    exit: extras.exit,
    customFields: e.customFields as unknown as EmployeeCustomField[],
    probationStartDate: extras.probationStartDate,
    probationEndDate: undef(e.probationEndDate),
    confirmationDate: undef(e.confirmationDate),
    confirmationStatus: extras.confirmationStatus,
  };
}

// Yearly paid-leave totals per employee: everyone's for Admin/HR (and the
// service account), only your own for an Employee.
async function leaveTotals(): Promise<Map<string, { remaining: number; allocated: number }>> {
  const session = await getSession();
  const totals = new Map<string, { remaining: number; allocated: number }>();
  if (session?.role === "Employee") {
    if (session.employeeId) {
      const own = await backend<ApiLeaveSummary>("/leave/me/summary");
      totals.set(session.employeeId, { remaining: own.totalRemaining, allocated: own.totalAllocated });
    }
    return totals;
  }
  for (const t of await backend<ApiLeaveTotals[]>("/leave/summaries")) {
    totals.set(t.employeeId, { remaining: t.totalRemaining, allocated: t.totalAllocated });
  }
  return totals;
}

// One backend round-trip per request, however many components ask.
const loadDirectory = cache(async (): Promise<EmployeeOverview[]> => {
  const [employees, extras, totals] = await Promise.all([
    backend<ApiEmployee[]>("/employees/directory"),
    getAllExtras(),
    leaveTotals(),
  ]);
  return employees.map((e) =>
    toOverview(e, extras[e.id] ?? {}, totals.get(e.id) ?? { remaining: 0, allocated: 0 }),
  );
});

export async function getEmployeeOverviews(): Promise<EmployeeOverview[]> {
  return loadDirectory();
}

export interface EmployeeDirectoryQuery {
  q?: string;
  departmentId?: string;
  status?: EmployeeStatus;
  includeDeactivated?: boolean;
  page?: number;
  size?: number;
}

export interface EmployeeDirectoryPage {
  items: ApiEmployeeSummary[];
  total: number;
  page: number;
  size: number;
}

// Server-side search/pagination over the full roster via `GET /employees`
// (Admin/HR only) - kept separate from `loadDirectory()`/`getEmployeeOverviews()`
// above, which every other page in the app depends on staying a full,
// unpaginated, richly-detailed list. This is for paging through a large
// roster by name/code/department/status; it doesn't carry photo,
// performance, or task fields (those are local "extras", not backend
// fields the thin `EmployeeSummary` projection returns).
export async function getEmployeeDirectoryPage(query: EmployeeDirectoryQuery): Promise<EmployeeDirectoryPage> {
  const page = await backend<ApiPage<ApiEmployeeSummary>>("/employees", {
    query: {
      q: query.q,
      departmentId: query.departmentId,
      status: query.status,
      includeDeactivated: query.includeDeactivated,
      page: query.page,
      size: query.size,
    },
  });
  return page;
}

export async function getEmployee(id: string): Promise<EmployeeOverview | null> {
  const list = await loadDirectory();
  return list.find((e) => e.id === id) ?? null;
}

export async function isEmployeeCodeTaken(code: string, exceptId?: string): Promise<boolean> {
  const lower = code.trim().toLowerCase();
  const list = await loadDirectory();
  return list.some((e) => e.id !== exceptId && e.employeeCode.toLowerCase() === lower);
}

// An Employee can only read/write their own record, through `/employees/me`.
async function employeePath(id: string): Promise<string> {
  const session = await getSession();
  return session?.role === "Employee" && session.employeeId === id ? "/employees/me" : `/employees/${id}`;
}

async function fetchOne(id: string): Promise<EmployeeOverview> {
  // Fresh read (not the per-request cache) - called right after a write.
  const [e, extras, totals] = await Promise.all([
    backend<ApiEmployee>(await employeePath(id)),
    getExtras(id),
    leaveTotals(),
  ]);
  return toOverview(e, extras, totals.get(id) ?? { remaining: 0, allocated: 0 });
}

export interface NewEmployeeInput {
  employeeCode: string;
  name: string;
  email: string;
  department: string;
  designation: string;
  joinedOn: string;
  age: number;
  salary: number;
  managerId?: string | null;
  location?: string;
  workType?: EmployeeOverview["workType"];
  employmentType?: string;
  probationPeriodMonths?: number;
  customFields?: EmployeeCustomField[];
  photoUrl?: string;
}

// Every hire enters at the top of the lifecycle: "Joining" lands them at
// status "Onboarding" with the default checklist, logged as a "Joined" event.
export async function addEmployee(input: NewEmployeeInput): Promise<EmployeeOverview> {
  const [departmentId, designationId, locationId] = await Promise.all([
    resolveRegistryId("departments", input.department),
    resolveRegistryId("designations", input.designation),
    input.location ? resolveRegistryId("locations", input.location) : Promise.resolve(null),
  ]);
  const probationEndDate =
    input.probationPeriodMonths !== undefined ? addMonths(input.joinedOn, input.probationPeriodMonths) : null;

  const created = await backend<ApiEmployee>("/employees", {
    method: "POST",
    body: {
      employeeCode: input.employeeCode,
      name: input.name,
      email: input.email,
      joinedOn: input.joinedOn,
      departmentId,
      designationId,
      locationId,
      managerId: input.managerId ?? null,
      status: "Onboarding",
      workType: input.workType ?? null,
      employmentType: input.employmentType ?? null,
      salary: input.salary,
      probationEndDate,
      customFields: input.customFields ?? [],
    },
  });

  await patchExtras(created.id, {
    photoUrl: input.photoUrl,
    age: input.age,
    performanceScore: 0,
    attendancePct: 100,
    tasks: { completed: 0, active: 0, completionPct: 0 },
    pendingRequests: 0,
    probationStartDate: input.joinedOn,
    confirmationStatus: "Probation",
    onboardingTasks: DEFAULT_ONBOARDING_TASKS.map((label, i) => ({ id: `task-${i}`, label, done: false })),
    lifecycleHistory: [
      { id: newEventId(), date: new Date().toISOString(), type: "Joined", performedBy: "Super Admin" },
    ],
  });
  return fetchOne(created.id);
}

// EmployeeOverview fields stored on the backend record under the same name.
const CORE_FIELDS = new Set<keyof EmployeeOverview>([
  "employeeCode",
  "name",
  "email",
  "status",
  "joinedOn",
  "salary",
  "phone",
  "personalEmail",
  "dateOfBirth",
  "gender",
  "maritalStatus",
  "currentAddress",
  "permanentAddress",
  "emergencyContact",
  "education",
  "experience",
  "managerId",
  "workType",
  "employmentType",
  "grade",
  "skills",
  "customFields",
  "probationEndDate",
  "confirmationDate",
]);

// Department/designation/location are names in the app, ids on the backend.
const REGISTRY_FIELDS = {
  department: ["departments", "departmentId"],
  designation: ["designations", "designationId"],
  location: ["locations", "locationId"],
} as const;

// The one write primitive every lifecycle action (confirm, transfer,
// promote, change designation/manager, initiate/finalize separation, record
// F&F, deactivate/reactivate, onboarding task toggles) goes through: apply a
// partial patch and, if given, append one audit entry. Core fields go to the
// backend; lifecycle extras and the audit entry go to the extras side file.
export async function patchEmployee(
  id: string,
  patch: Partial<EmployeeOverview>,
  event?: Omit<LifecycleEvent, "id" | "date">,
): Promise<EmployeeOverview | null> {
  const current = await getEmployee(id);
  if (!current) return null;

  const core: Record<string, unknown> = {};
  const extras: EmployeeExtras = {};
  for (const [key, raw] of Object.entries(patch) as [keyof EmployeeOverview, unknown][]) {
    // Blank/undefined clears the field (JSON drops undefined; the backend
    // rejects "" for emails/dates).
    const value = raw === "" || raw === undefined ? null : raw;
    if (CORE_FIELDS.has(key)) core[key] = value;
    else if (key in REGISTRY_FIELDS) {
      const [resource, field] = REGISTRY_FIELDS[key as keyof typeof REGISTRY_FIELDS];
      core[field] = value ? await resolveRegistryId(resource, String(value)) : null;
    } else if (isExtraKey(key)) (extras as Record<string, unknown>)[key] = raw;
  }

  if (Object.keys(core).length > 0) {
    await backend(await employeePath(id), { method: "PATCH", body: core });
  }
  if (patch.deactivated !== undefined && patch.deactivated !== current.deactivated) {
    await backend(`/employees/${id}/${patch.deactivated ? "deactivate" : "reactivate"}`, { method: "POST" });
  }
  if (event) {
    const entry: LifecycleEvent = { id: newEventId(), date: new Date().toISOString(), ...event };
    extras.lifecycleHistory = [entry, ...(extras.lifecycleHistory ?? current.lifecycleHistory)];
  }
  if (Object.keys(extras).length > 0) await patchExtras(id, extras);

  return fetchOne(id);
}
