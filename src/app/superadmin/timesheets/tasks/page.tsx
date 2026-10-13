import type { Metadata } from "next";
import { getAllTimesheetEntries } from "@/lib/hr/timesheet-store";
import { getProjects, getTasks } from "@/lib/hr/work-store";
import { getEmployeeOverviews } from "@/lib/hr/employee-store";
import TaskDistributionView from "@/components/hr/timesheets/TaskDistributionView";

export const metadata: Metadata = {
  title: "Task Distribution | HR Attendance",
};

export const dynamic = "force-dynamic";

export default async function TimesheetTaskDistributionPage() {
  const [entries, tasks, projects, employees] = await Promise.all([
    getAllTimesheetEntries(),
    getTasks(),
    getProjects(),
    getEmployeeOverviews(),
  ]);

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 4px" }}>Task Distribution</h1>
        <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: 0 }}>
          Logged hours grouped by task and project, from employees' own timesheet entries.
        </p>
      </div>
      <TaskDistributionView entries={entries} tasks={tasks} projects={projects} employees={employees} />
    </>
  );
}
