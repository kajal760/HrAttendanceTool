import type { Metadata } from "next";
import { getTasksForEmployee, getTasks } from "@/lib/hr/work-store";
import { getEmployeeOverviews } from "@/lib/hr/employee-store";
import { requireCurrentEmployee } from "@/lib/auth/current-employee";
import SectionCard from "@/components/employee/SectionCard";
import TimesheetPanel from "@/components/employee/TimesheetPanel";

export const metadata: Metadata = {
  title: "Timesheet | HR Attendance",
};

export const dynamic = "force-dynamic";

export default async function EmployeeTimesheetPage() {
  const employee = await requireCurrentEmployee();
  const [myTasks, allTasks, employees] = await Promise.all([
    getTasksForEmployee(employee.id),
    getTasks(),
    getEmployeeOverviews(),
  ]);

  const employeeNames = Object.fromEntries(employees.map((e) => [e.id, e.name]));
  const taskTitles = Object.fromEntries(allTasks.map((t) => [t.id, t.title]));

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 4px" }}>Timesheet</h1>
        <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: 0 }}>
          Log what you worked on today - hours, an optional linked task, and a short description.
        </p>
      </div>

      <SectionCard title="Log time">
        <TimesheetPanel
          myEmployeeId={employee.id}
          myTasks={myTasks}
          employeeNames={employeeNames}
          taskTitles={taskTitles}
        />
      </SectionCard>
    </>
  );
}
