import { redirect } from "next/navigation";
import type { EmployeeOverview } from "@/types/hr";
import { getEmployee } from "@/lib/hr/employee-store";
import { getSession } from "./get-session";

// For pages under /employee that need the signed-in employee's own Employee
// Master record. `proxy.ts` already keeps unauthenticated/wrong-role
// requests out, but Server Components shouldn't rely on that alone (a
// matcher change could silently drop coverage) - this re-checks and bounces
// to /login if anything's missing.
export async function requireCurrentEmployee(): Promise<EmployeeOverview> {
  const session = await getSession();
  if (!session?.employeeId) redirect("/login");

  const employee = await getEmployee(session.employeeId);
  if (!employee) redirect("/login");

  return employee;
}
