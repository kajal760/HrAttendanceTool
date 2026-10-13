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
  const [employee, allEmployees] = await Promise.all([requireCurrentEmployee(), getEmployeeOverviews()]);
  const managerName = allEmployees.find((e) => e.id === employee.managerId)?.name;
  return { employee, managerName };
}
