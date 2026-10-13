import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { EmployeeCustomField, EmployeeOverview, ExitChecklistItem, LifecycleEvent } from "@/types/hr";

// TODO: replace with a real employee directory (DB-backed) once one exists.
// The seed list below is the starting roster; anything added via "Add
// employee" is layered on top and persisted to a JSON index file rather
// than kept in a module-level array - Next's dev server (Turbopack) runs
// route handlers and page components in separate module instances, so a
// plain in-memory array written by one is invisible to the other (same
// issue worked around in `superadmin/document-store.ts`). Fine for
// `next dev`/a single `next start` process, not for a multi-instance
// deployment.

type SeedEmployeeBase = Omit<
  EmployeeOverview,
  "education" | "experience" | "skills" | "onboardingTasks" | "lifecycleHistory" | "deactivated"
>;

const SEED_BASE: SeedEmployeeBase[] = [
  {
    id: "emp-1024",
    employeeCode: "EMP-1024",
    name: "Aditi Sharma",
    initials: "AS",
    email: "aditi.sharma@hrattendance.example",
    department: "Engineering",
    designation: "Software Engineer",
    status: "Active",
    joinedOn: "2024-01-15",
    age: 27,
    salary: 1450000,
    performanceScore: 88,
    attendancePct: 96,
    leave: { remaining: 15, allocated: 24 },
    tasks: { completed: 11, active: 6, completionPct: 79 },
    pendingRequests: 1,
  },
  {
    id: "emp-1032",
    employeeCode: "EMP-1032",
    name: "Rohit Verma",
    initials: "RV",
    email: "rohit.verma@hrattendance.example",
    department: "Engineering",
    designation: "Senior Software Engineer",
    status: "Active",
    joinedOn: "2022-06-01",
    age: 31,
    salary: 2150000,
    performanceScore: 91,
    attendancePct: 94,
    leave: { remaining: 10, allocated: 24 },
    tasks: { completed: 24, active: 4, completionPct: 92 },
    pendingRequests: 0,
  },
  {
    id: "emp-1045",
    employeeCode: "EMP-1045",
    name: "Neha Kapoor",
    initials: "NK",
    email: "neha.kapoor@hrattendance.example",
    department: "Human Resources",
    designation: "HR Manager",
    status: "Active",
    joinedOn: "2021-03-10",
    age: 36,
    salary: 1950000,
    performanceScore: 85,
    attendancePct: 98,
    leave: { remaining: 6, allocated: 24 },
    tasks: { completed: 14, active: 3, completionPct: 88 },
    pendingRequests: 2,
  },
  {
    id: "emp-1051",
    employeeCode: "EMP-1051",
    name: "Sameer Iyer",
    initials: "SI",
    email: "sameer.iyer@hrattendance.example",
    department: "Product",
    designation: "Product Manager",
    status: "Active",
    joinedOn: "2023-02-20",
    age: 34,
    salary: 2400000,
    performanceScore: 79,
    attendancePct: 90,
    leave: { remaining: 12, allocated: 24 },
    tasks: { completed: 9, active: 7, completionPct: 68 },
    pendingRequests: 1,
  },
  {
    id: "emp-1067",
    employeeCode: "EMP-1067",
    name: "Priya Nair",
    initials: "PN",
    email: "priya.nair@hrattendance.example",
    department: "Design",
    designation: "UI/UX Designer",
    status: "On Leave",
    joinedOn: "2023-08-05",
    age: 26,
    salary: 1250000,
    performanceScore: 82,
    attendancePct: 87,
    leave: { remaining: 3, allocated: 24 },
    tasks: { completed: 12, active: 2, completionPct: 90 },
    pendingRequests: 0,
  },
  {
    id: "emp-1078",
    employeeCode: "EMP-1078",
    name: "Karan Mehta",
    initials: "KM",
    email: "karan.mehta@hrattendance.example",
    department: "Sales",
    designation: "Sales Executive",
    status: "Active",
    joinedOn: "2022-11-12",
    age: 29,
    salary: 980000,
    performanceScore: 74,
    attendancePct: 91,
    leave: { remaining: 9, allocated: 20 },
    tasks: { completed: 18, active: 5, completionPct: 76 },
    pendingRequests: 3,
  },
  {
    id: "emp-1083",
    employeeCode: "EMP-1083",
    name: "Divya Reddy",
    initials: "DR",
    email: "divya.reddy@hrattendance.example",
    department: "Finance",
    designation: "Financial Analyst",
    status: "Active",
    joinedOn: "2024-04-01",
    age: 25,
    salary: 1100000,
    performanceScore: 89,
    attendancePct: 97,
    leave: { remaining: 18, allocated: 24 },
    tasks: { completed: 8, active: 2, completionPct: 91 },
    pendingRequests: 0,
  },
  {
    id: "emp-1091",
    employeeCode: "EMP-1091",
    name: "Arjun Nair",
    initials: "AN",
    email: "arjun.nair@hrattendance.example",
    department: "Engineering",
    designation: "QA Engineer",
    status: "Active",
    joinedOn: "2023-09-18",
    age: 28,
    salary: 1050000,
    performanceScore: 70,
    attendancePct: 85,
    leave: { remaining: 14, allocated: 24 },
    tasks: { completed: 10, active: 6, completionPct: 63 },
    pendingRequests: 1,
  },
  {
    id: "emp-1099",
    employeeCode: "EMP-1099",
    name: "Fatima Sheikh",
    initials: "FS",
    email: "fatima.sheikh@hrattendance.example",
    department: "Marketing",
    designation: "Marketing Lead",
    status: "Active",
    joinedOn: "2021-12-01",
    age: 33,
    salary: 2050000,
    performanceScore: 93,
    attendancePct: 99,
    leave: { remaining: 7, allocated: 24 },
    tasks: { completed: 16, active: 3, completionPct: 94 },
    pendingRequests: 0,
  },
];

const SEED_SKILLS: Record<string, string[]> = {
  "emp-1024": ["TypeScript", "React", "Node.js"],
  "emp-1032": ["Java", "Spring Boot", "System Design"],
  "emp-1045": ["Recruitment", "Employee Relations", "Payroll"],
  "emp-1051": ["Product Strategy", "Roadmapping", "SQL"],
  "emp-1067": ["Figma", "User Research", "Design Systems"],
  "emp-1078": ["Negotiation", "CRM", "Lead Generation"],
  "emp-1083": ["Financial Modeling", "Excel", "Forecasting"],
  "emp-1091": ["Test Automation", "Selenium", "QA Strategy"],
  "emp-1099": ["SEO", "Content Strategy", "Campaign Analytics"],
};

// The seed roster is already past onboarding - each gets a single "Joined"
// history entry dated at their joinedOn and an empty onboarding checklist.
const SEED_EMPLOYEES: EmployeeOverview[] = SEED_BASE.map((base) => ({
  ...base,
  education: [],
  experience: [],
  skills: SEED_SKILLS[base.id] ?? [],
  onboardingTasks: [],
  deactivated: false,
  lifecycleHistory: [
    {
      id: `${base.id}-joined`,
      date: base.joinedOn,
      type: "Joined",
      performedBy: "Super Admin",
    },
  ],
}));

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

const DATA_DIR = path.join(process.cwd(), ".data");
const INDEX_PATH = path.join(DATA_DIR, "employees.json");

// Records saved before employee IDs existed get a code derived from their
// internal id; HR can change it from the edit form.
export function defaultEmployeeCode(id: string): string {
  return `EMP-${id.replace(/^emp-/, "")}`;
}

async function readIndex(): Promise<EmployeeOverview[]> {
  let list: EmployeeOverview[];
  try {
    list = JSON.parse(await readFile(INDEX_PATH, "utf8")) as EmployeeOverview[];
  } catch {
    list = SEED_EMPLOYEES;
  }
  return list.map((e) => (e.employeeCode ? e : { ...e, employeeCode: defaultEmployeeCode(e.id) }));
}

export async function isEmployeeCodeTaken(code: string, exceptId?: string): Promise<boolean> {
  const lower = code.trim().toLowerCase();
  const list = await readIndex();
  return list.some((e) => e.id !== exceptId && e.employeeCode.toLowerCase() === lower);
}

async function writeIndex(list: EmployeeOverview[]): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(INDEX_PATH, JSON.stringify(list, null, 2), "utf8");
}

export async function getEmployeeOverviews(): Promise<EmployeeOverview[]> {
  return readIndex();
}

export async function getEmployee(id: string): Promise<EmployeeOverview | null> {
  const list = await readIndex();
  return list.find((e) => e.id === id) ?? null;
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

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

function addMonths(dateStr: string, months: number): string {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

function newEventId(): string {
  return `evt-${Date.now()}-${Math.round(Math.random() * 1e6)}`;
}

// New hires start with a clean slate - no performance/attendance history,
// leave, or task activity yet - so those fields default rather than coming
// from the form. Every hire enters at the top of the lifecycle: "Joining"
// lands them at status "Onboarding" with the default checklist, logged as
// a "Joined" event.
export async function addEmployee(input: NewEmployeeInput): Promise<EmployeeOverview> {
  const now = new Date().toISOString();
  const employee: EmployeeOverview = {
    id: `emp-${Date.now()}`,
    employeeCode: input.employeeCode.trim(),
    name: input.name,
    initials: initialsFor(input.name),
    email: input.email,
    department: input.department,
    designation: input.designation,
    status: "Onboarding",
    joinedOn: input.joinedOn,
    age: input.age,
    salary: input.salary,
    performanceScore: 0,
    attendancePct: 100,
    leave: { remaining: 24, allocated: 24 },
    tasks: { completed: 0, active: 0, completionPct: 0 },
    pendingRequests: 0,
    managerId: input.managerId ?? null,
    location: input.location,
    workType: input.workType,
    employmentType: input.employmentType,
    customFields: input.customFields ?? [],
    photoUrl: input.photoUrl,
    probationStartDate: input.joinedOn,
    probationEndDate:
      input.probationPeriodMonths !== undefined
        ? addMonths(input.joinedOn, input.probationPeriodMonths)
        : undefined,
    confirmationStatus: "Probation",
    education: [],
    experience: [],
    skills: [],
    onboardingTasks: DEFAULT_ONBOARDING_TASKS.map((label, i) => ({
      id: `task-${i}`,
      label,
      done: false,
    })),
    deactivated: false,
    lifecycleHistory: [{ id: newEventId(), date: now, type: "Joined", performedBy: "Super Admin" }],
  };

  const list = await readIndex();
  await writeIndex([employee, ...list]);
  return employee;
}

// The one write primitive every lifecycle action (confirm, transfer,
// promote, change designation/manager, initiate/finalize separation, record
// F&F, deactivate/reactivate, onboarding task toggles) goes through: apply a
// partial patch and, if given, append one audit entry - atomically, in a
// single read-modify-write of the index.
export async function patchEmployee(
  id: string,
  patch: Partial<EmployeeOverview>,
  event?: Omit<LifecycleEvent, "id" | "date">,
): Promise<EmployeeOverview | null> {
  const list = await readIndex();
  const index = list.findIndex((e) => e.id === id);
  if (index === -1) return null;

  const current = list[index];
  const updated: EmployeeOverview = { ...current, ...patch };
  if (event) {
    const entry: LifecycleEvent = { id: newEventId(), date: new Date().toISOString(), ...event };
    updated.lifecycleHistory = [entry, ...current.lifecycleHistory];
  }
  list[index] = updated;
  await writeIndex(list);
  return updated;
}
