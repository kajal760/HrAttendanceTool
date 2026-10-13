import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { AuthUser, Role } from "@/types/auth";
import { hashPassword } from "./password";

// Same disk-backed JSON-index pattern as `employee-store.ts` - Next's dev
// server (Turbopack) runs route handlers and page components in separate
// module instances, so a plain in-memory array written by one is invisible
// to the other.

const DATA_DIR = path.join(process.cwd(), ".data");
const INDEX_PATH = path.join(DATA_DIR, "users.json");

interface SeedUserInput {
  id: string;
  email: string;
  password: string;
  role: Role;
  name: string;
  employeeId?: string;
}

// One login per seed employee (email already matches their
// `employee-store.ts` record), password-of-convenience for a prototype with
// no self-service reset flow yet. Neha Kapoor is HR Manager by designation,
// so she's the one HR-role login; everyone else from the roster is an
// Employee login. The one Admin account isn't tied to an employee record at
// all - same split the BRD draws between "Admin" and "HR Manager".
const SEED_USERS: SeedUserInput[] = [
  { id: "user-admin", email: "admin@hrattendance.example", password: "admin123", role: "Admin", name: "Super Admin" },
  { id: "user-1045", email: "neha.kapoor@hrattendance.example", password: "hr123", role: "HR", name: "Neha Kapoor", employeeId: "emp-1045" },
  { id: "user-1024", email: "aditi.sharma@hrattendance.example", password: "employee123", role: "Employee", name: "Aditi Sharma", employeeId: "emp-1024" },
  { id: "user-1032", email: "rohit.verma@hrattendance.example", password: "employee123", role: "Employee", name: "Rohit Verma", employeeId: "emp-1032" },
  { id: "user-1051", email: "sameer.iyer@hrattendance.example", password: "employee123", role: "Employee", name: "Sameer Iyer", employeeId: "emp-1051" },
  { id: "user-1067", email: "priya.nair@hrattendance.example", password: "employee123", role: "Employee", name: "Priya Nair", employeeId: "emp-1067" },
  { id: "user-1078", email: "karan.mehta@hrattendance.example", password: "employee123", role: "Employee", name: "Karan Mehta", employeeId: "emp-1078" },
  { id: "user-1083", email: "divya.reddy@hrattendance.example", password: "employee123", role: "Employee", name: "Divya Reddy", employeeId: "emp-1083" },
  { id: "user-1091", email: "arjun.nair@hrattendance.example", password: "employee123", role: "Employee", name: "Arjun Nair", employeeId: "emp-1091" },
  { id: "user-1099", email: "fatima.sheikh@hrattendance.example", password: "employee123", role: "Employee", name: "Fatima Sheikh", employeeId: "emp-1099" },
];

function seedUsers(): AuthUser[] {
  return SEED_USERS.map(({ password, ...u }) => ({ ...u, passwordHash: hashPassword(password) }));
}

async function readIndex(): Promise<AuthUser[]> {
  try {
    const raw = await readFile(INDEX_PATH, "utf8");
    return JSON.parse(raw) as AuthUser[];
  } catch {
    const seeded = seedUsers();
    await writeIndex(seeded);
    return seeded;
  }
}

async function writeIndex(list: AuthUser[]): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(INDEX_PATH, JSON.stringify(list, null, 2), "utf8");
}

export async function getUsers(): Promise<AuthUser[]> {
  return readIndex();
}

export async function getUserByEmail(email: string): Promise<AuthUser | null> {
  const list = await readIndex();
  const lower = email.trim().toLowerCase();
  return list.find((u) => u.email.toLowerCase() === lower) ?? null;
}

export async function getUserByEmployeeId(employeeId: string): Promise<AuthUser | null> {
  const list = await readIndex();
  return list.find((u) => u.employeeId === employeeId) ?? null;
}

// Backs the Lifecycle module's "Role Change" action - updates which portal
// and permission level an employee's login resolves to (`proxy.ts` reads
// this role straight out of the session on their next request). Returns
// null if the employee has no login account to change.
export async function updateUserRole(employeeId: string, role: Role): Promise<AuthUser | null> {
  const list = await readIndex();
  const index = list.findIndex((u) => u.employeeId === employeeId);
  if (index === -1) return null;
  const updated: AuthUser = { ...list[index], role };
  list[index] = updated;
  await writeIndex(list);
  return updated;
}
