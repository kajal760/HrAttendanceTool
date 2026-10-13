// Authentication & role types - BRD section 3 ("User Roles & Website
// Capabilities") maps Admin/HR Manager/Employee to this app's existing
// Super Admin and Employee portals: Admin and HR both land in /superadmin
// (this prototype doesn't yet split their permissions further - see
// RolesMatrix for the planned permission boundary), Employee lands in
// /employee.

export type Role = "Admin" | "HR" | "Employee";

export interface AuthUser {
  id: string;
  email: string;
  passwordHash: string;
  role: Role;
  name: string;
  // Links a HR/Employee login to their Employee Master record
  // (`@/lib/hr/employee-store`) - unset for a pure Admin account that isn't
  // also an employee.
  employeeId?: string;
}

// What's actually stored in the signed session cookie - deliberately a
// subset of AuthUser (no password hash).
export interface SessionPayload {
  userId: string;
  email: string;
  role: Role;
  name: string;
  employeeId?: string;
}
