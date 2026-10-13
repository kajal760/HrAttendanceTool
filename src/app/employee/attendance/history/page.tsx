import type { Metadata } from "next";
import { getAttendanceCalendar, getTimesheetLog } from "@/lib/employee/mock-data";
import SectionCard from "@/components/employee/SectionCard";
import DateRangeFilter from "@/components/employee/DateRangeFilter";
import TimesheetSummary from "@/components/employee/TimesheetSummary";
import AttendanceHistoryView from "@/components/employee/AttendanceHistoryView";

export const metadata: Metadata = {
  title: "Attendance History | HR Attendance",
};

type SearchParams = { year?: string; month?: string; from?: string; to?: string };

export default async function EmployeeAttendanceHistoryPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const now = new Date();
  const year = params.year ? Number(params.year) : now.getFullYear();
  const month = params.month ? Number(params.month) : now.getMonth();
  const from = params.from ?? "";
  const to = params.to ?? "";

  const [all, calendarDays] = await Promise.all([getTimesheetLog(), getAttendanceCalendar(year, month)]);
  const entries = all.filter((e) => (!from || e.date >= from) && (!to || e.date <= to));

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 4px" }}>Attendance History</h1>
        <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: 0 }}>
          Previous dates, clock-in/out times, working hours, and work mode - filter by date, or
          switch to a month-by-month calendar view.
        </p>
      </div>

      <div style={{ marginBottom: 16 }}>
        <SectionCard title="Weekly summary" subtitle="Net hours, break time, and days present per week">
          <TimesheetSummary entries={entries} />
        </SectionCard>
      </div>

      <SectionCard title="Daily log" subtitle="Table or calendar view, filterable by date">
        <DateRangeFilter from={from} to={to} />
        <AttendanceHistoryView entries={entries} calendarDays={calendarDays} year={year} month={month} />
      </SectionCard>
    </>
  );
}
