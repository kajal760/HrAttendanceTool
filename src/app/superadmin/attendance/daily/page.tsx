import type { Metadata } from "next";
import { getRangeRecords, resolvePeriod } from "@/lib/hr/attendance-daily";
import PeriodFilter from "@/components/hr/attendance/PeriodFilter";
import AttendanceTable from "@/components/hr/attendance/AttendanceTable";

export const metadata: Metadata = {
  title: "Daily Attendance | HR Attendance",
};

export const dynamic = "force-dynamic";

type SearchParams = { period?: string; date?: string; from?: string; to?: string };

export default async function DailyAttendancePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const period = resolvePeriod(await searchParams);
  const records = await getRangeRecords(period.from, period.to);

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 4px" }}>Daily Attendance</h1>
        <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: 0 }}>
          Check-in and check-out, working hours, breaks, work mode, and location verification - one row per employee per day.
        </p>
      </div>

      <PeriodFilter period={period.mode} anchor={period.anchor} from={period.from} to={period.to} />

      {records.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--color-text-muted)" }}>No attendance is recorded for weekends.</p>
      ) : (
        <AttendanceTable records={records} variant="daily" />
      )}
    </>
  );
}
