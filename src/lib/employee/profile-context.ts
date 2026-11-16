import type { EmployeeOverview } from "@/types/hr";
import { getEmployeeOverviews } from "@/lib/hr/employee-store";
import { requireCurrentEmployee } from "@/lib/auth/current-employee";

export interface ProfileContext {
  employee: EmployeeOverview;
  managerName?: string;
}

// Shared by all three Profile tabs (Personal Details/Contact/Work Details)
// so the managerId -> name lookup isn't duplicated in each page.
export async function loadProfileContext(): Promise<ProfileContext> {
  // `getEmployeeOverviews()` hits the Admin/HR-only `/employees/directory`
  // endpoint - an Employee-role session gets a 401 there by design, so this
  // degrades to "manager name unknown" instead of crashing the page.
  const [employee, allEmployees] = await Promise.all([
    requireCurrentEmployee(),
    getEmployeeOverviews().catch(() => []),
  ]);
  const managerName = allEmployees.find((e) => e.id === employee.managerId)?.name;
  return { employee, managerName };
}
