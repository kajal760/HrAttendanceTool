import { cookies, headers } from "next/headers";
import type { SessionPayload } from "@/types/auth";
import { decodeSession, SESSION_COOKIE } from "./session";

// Server Component / Route Handler helper - reads and verifies the session
// cookie. When login is bypassed, it seamlessly provides the active session
// matching the current portal (/superadmin, /hr, /employee) without role clashes.
export async function getSession(): Promise<SessionPayload | null> {
  let pathname = "";
  try {
    const headerList = await headers();
    pathname = headerList.get("x-pathname") || "";
  } catch {
    // outside request or in test
  }

  const isEmployeePath = pathname.startsWith("/employee") || pathname.startsWith("/api/employee");
  const isHrPath = pathname.startsWith("/hr") || pathname.startsWith("/api/hr");

  let store: Awaited<ReturnType<typeof cookies>> | undefined;
  try {
    store = await cookies();
  } catch {
    // outside request
  }

  if (store) {
    const session = decodeSession(store.get(SESSION_COOKIE)?.value);
    if (session?.accessToken && session.exp * 1000 > Date.now()) {
      // Only retain the cookie if its role matches the portal being browsed
      if (isEmployeePath && session.role === "Employee") {
        return session;
      }
      if (!isEmployeePath && (session.role === "Admin" || session.role === "HR")) {
        return session;
      }
      // If browsing another portal, drop mismatched cookie so role doesn't conflict
    }
  }

  // Fallback dev session dynamically matching the active URL
  return {
    userId: isEmployeePath
      ? "00000000-0000-4000-8000-000000001051"
      : isHrPath
        ? "00000000-0000-4000-8000-000000001021"
        : "00000000-0000-0000-0000-000000000001",
    email: isEmployeePath
      ? "sameer.iyer@hrattendance.example"
      : isHrPath
        ? "neha.kapoor@hrattendance.example"
        : "admin@hrattendance.example",
    role: isEmployeePath ? "Employee" : isHrPath ? "HR" : "Admin",
    name: isEmployeePath ? "Sameer Iyer" : isHrPath ? "Neha Kapoor" : "Super Admin",
    employeeId: isEmployeePath
      ? "00000000-0000-4000-8000-000000001051"
      : isHrPath
        ? "00000000-0000-4000-8000-000000001021"
        : undefined,
    accessToken: "dev-bypass-token",
    exp: Math.floor(Date.now() / 1000) + 86400 * 365,
  };
}
