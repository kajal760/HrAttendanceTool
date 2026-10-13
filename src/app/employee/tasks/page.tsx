import type { Metadata } from "next";
import { getProjects, getTasks, getTasksForEmployee } from "@/lib/hr/work-store";
import { getEmployeeOverviews } from "@/lib/hr/employee-store";
import { requireCurrentEmployee } from "@/lib/auth/current-employee";
import { resolveTasksWithProject } from "@/lib/employee/task-dependencies";
import EmployeeTaskBoard from "@/components/employee/EmployeeTaskBoard";

export const metadata: Metadata = {
  title: "My Tasks | HR Attendance",
};

export const dynamic = "force-dynamic";

export default async function EmployeeTasksPage() {
  const employee = await requireCurrentEmployee();
  const [myTasks, allTasks, projects, employees] = await Promise.all([
    getTasksForEmployee(employee.id),
    getTasks(),
    getProjects(),
    getEmployeeOverviews(),
  ]);

  const tasks = resolveTasksWithProject(myTasks, allTasks, projects);

  // Mention options: any employee, same unscoped precedent as the existing
  // HR Requests mention picker.
  const mentionOptions = employees
    .filter((e) => e.id !== employee.id)
    .map((e) => ({ id: e.id, label: e.name, email: e.email }));

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 4px" }}>My Tasks</h1>
        <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: 0 }}>
          Deliverables your manager has assigned you, with deadlines and live status.
          You can add a progress summary and mention a colleague - everything else is set by HR/your manager.
        </p>
      </div>
      <EmployeeTaskBoard tasks={tasks} employeeId={employee.id} mentionOptions={mentionOptions} />
    </>
  );
}
