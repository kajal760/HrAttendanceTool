import type { Metadata } from "next";
import { getLeaveRequests } from "@/lib/hr/leave-store";
import LeaveCalendar from "@/components/hr/leave/LeaveCalendar";

export const metadata: Metadata = {
  title: "Leave Calendar | HR Attendance",
};

export const dynamic = "force-dynamic";

type SearchParams = { year?: string; month?: string };

export default async function SuperAdminLeaveCalendarPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const now = new Date();
  const year = params.year ? Number(params.year) : now.getFullYear();
  const month = params.month ? Number(params.month) : now.getMonth();
  const requests = await getLeaveRequests();

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 4px" }}>Leave Calendar</h1>
        <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: 0 }}>
          Who's on approved or pending leave, by day.
        </p>
      </div>
      <LeaveCalendar requests={requests} year={year} month={month} />
    </>
  );
}
