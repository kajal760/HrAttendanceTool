import type { EmployeeOverview } from "@/types/hr";
import { getEmployee } from "@/lib/hr/employee-store";
import { getSession } from "./get-session";

const FALLBACK_EMPLOYEE: EmployeeOverview = {
  id: "00000000-0000-4000-8000-000000001051",
  employeeCode: "EMP-1051",
  name: "Sameer Iyer",
  initials: "SI",
  email: "sameer.iyer@hrattendance.example",
  department: "Product",
  designation: "Product Manager",
  status: "Active",
  joinedOn: "2023-02-20",
  age: 28,
  salary: 75000,
  performanceScore: 92,
  attendancePct: 98,
  leave: { remaining: 18, allocated: 26 },
  tasks: { completed: 12, active: 3, completionPct: 80 },
  pendingRequests: 0,
  skills: ["React", "TypeScript", "Next.js"],
  education: [],
  experience: [],
  customFields: [],
  onboardingTasks: [],
  lifecycleHistory: [],
  deactivated: false,
};

// For pages under /employee that need the active employee's record.
// If not found or backend is offline, provides fallback active employee data
// so pages remain directly viewable without login redirects.
export async function requireCurrentEmployee(): Promise<EmployeeOverview> {
  const session = await getSession();
  const employeeId = session?.employeeId ?? FALLBACK_EMPLOYEE.id;

  try {
    const employee = await getEmployee(employeeId);
    if (employee) return employee;
  } catch {
    // backend offline or employee lookup failed
  }

  return FALLBACK_EMPLOYEE;
}
