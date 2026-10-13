import type { Metadata } from "next";
import { getRangeRecords, resolvePeriod } from "@/lib/hr/attendance-daily";
import { getCorrections } from "@/lib/hr/attendance-corrections";
import { getEmployeeOverviews } from "@/lib/hr/employee-store";
import PeriodFilter from "@/components/hr/attendance/PeriodFilter";
import TimesheetView from "@/components/hr/timesheets/TimesheetView";

export const metadata: Metadata = {
  title: "Working Hours | HR Attendance",
};

export const dynamic = "force-dynamic";

type SearchParams = { period?: string; date?: string; from?: string; to?: string };

export default async function TimesheetHoursPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const period = resolvePeriod(await searchParams);
  const [records, corrections, employees] = await Promise.all([
    getRangeRecords(period.from, period.to),
    getCorrections(),
    getEmployeeOverviews(),
  ]);

  // Leave days aren't working time, so they're left out of the timesheet.
  const working = records.filter((r) => r.status !== "On Leave");
  const pendingKeys = corrections
    .filter((c) => c.status === "Pending" && c.date >= period.from && c.date <= period.to)
    .map((c) => `${c.employeeId}|${c.date}`);

  const people = employees.map((e) => ({
    id: e.id,
    name: e.name,
    employeeCode: e.employeeCode,
    department: e.department,
    designation: e.designation,
  }));

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 4px" }}>Working Hours</h1>
        <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: 0 }}>
          Check-in/out, gross and net working hours, by employee and day.
        </p>
      </div>

      <PeriodFilter period={period.mode} anchor={period.anchor} from={period.from} to={period.to} />

      <TimesheetView rows={working} pendingKeys={pendingKeys} people={people} periodFrom={period.from} periodTo={period.to} />
    </>
  );
}
