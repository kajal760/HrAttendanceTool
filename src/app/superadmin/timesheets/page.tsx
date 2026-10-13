import type { Metadata } from "next";
import { getAllTimesheetEntries } from "@/lib/hr/timesheet-store";
import { getEmployeeOverviews } from "@/lib/hr/employee-store";
import { getTasks } from "@/lib/hr/work-store";
import TimesheetEntriesTable from "@/components/hr/timesheets/TimesheetEntriesTable";

export const metadata: Metadata = {
  title: "Employee Timesheets | HR Attendance",
};

export const dynamic = "force-dynamic";

export default async function EmployeeTimesheetsPage() {
  const [entries, employees, tasks] = await Promise.all([
    getAllTimesheetEntries(),
    getEmployeeOverviews(),
    getTasks(),
  ]);
  const taskTitles = Object.fromEntries(tasks.map((t) => [t.id, t.title]));

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 4px" }}>Employee Timesheets</h1>
        <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: 0 }}>
          What everyone logged - hours, optional task link, and a short description.
        </p>
      </div>
      <TimesheetEntriesTable entries={entries} employees={employees} taskTitles={taskTitles} />
    </>
  );
}
