import { backend } from "@/lib/api/backend";
import type { ApiEmployee } from "@/lib/api/types";
import type { Role } from "@/types/auth";

// Portal logins live in the FastAPI backend (`users` table); passwords are
// verified there (see `/api/auth/login`). This module only exposes what the
// Lifecycle module's Role Change form needs: which employees have a login
// and with what role.

export interface LoginAccount {
  email: string;
  role: Role;
  name: string;
  employeeId: string;
}

export async function getUsers(): Promise<LoginAccount[]> {
  const employees = await backend<ApiEmployee[]>("/employees/directory");
  return employees
    .filter((e) => e.loginRole)
    .map((e) => ({ email: e.email, role: e.loginRole as Role, name: e.name, employeeId: e.id }));
}

export async function getUserByEmployeeId(employeeId: string): Promise<LoginAccount | null> {
  const users = await getUsers();
  return users.find((u) => u.employeeId === employeeId) ?? null;
}

// Every employee, logged-in or not (`role: null` means no portal login yet) -
// what the "Create account" picker needs to offer only employees who don't
// already have one.
export interface DirectoryAccount {
  employeeId: string;
  employeeCode: string;
  name: string;
  email: string;
  role: Role | null;
}

export async function getDirectoryAccounts(): Promise<DirectoryAccount[]> {
  const employees = await backend<ApiEmployee[]>("/employees/directory");
  return employees.map((e) => ({
    employeeId: e.id,
    employeeCode: e.employeeCode,
    name: e.name,
    email: e.email,
    role: (e.loginRole as Role) ?? null,
  }));
}

export interface NewLoginInput {
  employeeId: string;
  email: string;
  password: string;
  role: "HR" | "Employee";
}

// HR provisioning a first-time login for an employee who doesn't have one
// yet - a POST, unlike `updateUserRole`'s PUT (which only changes an
// existing login's role and 404s/no-ops on an employee with none).
export async function createUserLogin(input: NewLoginInput): Promise<void> {
  await backend(`/employees/${input.employeeId}/login`, {
    method: "POST",
    body: { role: input.role, email: input.email, password: input.password },
  });
}

// Backs the Lifecycle module's "Role Change" action - changes which portal
// the employee's login lands in on their next sign-in. Admin-only on the
// backend. Returns null if the employee has no login to change.
export async function updateUserRole(employeeId: string, role: Role): Promise<LoginAccount | null> {
  const account = await getUserByEmployeeId(employeeId);
  if (!account) return null;
  await backend(`/employees/${employeeId}/login`, { method: "PUT", body: { role } });
  return { ...account, role };
}
