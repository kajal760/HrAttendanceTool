// Authentication & role types - BRD section 3 ("User Roles & Website
// Capabilities") maps Admin/HR Manager/Employee to this app's existing
// Super Admin and Employee portals: Admin and HR both land in /superadmin
// (this prototype doesn't yet split their permissions further - see
// RolesMatrix for the planned permission boundary), Employee lands in
// /employee.

export type Role = "Admin" | "HR" | "Employee";

// What's stored in the signed session cookie. `accessToken` is the FastAPI
// backend's bearer token - the Next.js server sends it on every backend
// call (`@/lib/api/backend`); the cookie is httpOnly, so the browser never
// reads it. `exp` (epoch seconds) mirrors the token's expiry.
//
// Login is email + OTP (see `@/components/auth/LoginForm`), so the identity
// carried here is the signed-in email address - mirrors `SessionUser` in
// the backend's `app/schemas/auth.py`.
export interface SessionPayload {
  userId: string;
  email: string;
  role: Role;
  name: string;
  employeeId?: string;
  accessToken: string;
  exp: number;
}
