import type { Metadata } from "next";
import Link from "next/link";
import { getLeaveRequests } from "@/lib/hr/leave-store";
import { getSession } from "@/lib/auth/get-session";
import { withBase } from "@/lib/portal";
import LeaveCalendar from "@/components/hr/leave/LeaveCalendar";
import LeaveWeekView from "@/components/hr/leave/LeaveWeekView";
import LeaveListView from "@/components/hr/leave/LeaveListView";
import UpcomingLeavesPanel from "@/components/hr/leave/UpcomingLeavesPanel";
import styles from "@/components/hr/leave/Leave.module.css";

export const metadata: Metadata = {
  title: "Leave Calendar | HumSetu",
};

export const dynamic = "force-dynamic";

type ViewMode = "month" | "week" | "list";
const VIEWS: { key: ViewMode; label: string }[] = [
  { key: "month", label: "Month" },
  { key: "week", label: "Week" },
  { key: "list", label: "List" },
];

type SearchParams = { year?: string; month?: string; view?: string };

function todayIso(): string {
  return new Date().toLocaleDateString("en-CA");
}

export default async function SuperAdminLeaveCalendarPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const now = new Date();
  const year = params.year ? Number(params.year) : now.getFullYear();
  const month = params.month ? Number(params.month) : now.getMonth();
  const view: ViewMode = params.view === "week" || params.view === "list" ? params.view : "month";
  const [requests, session] = await Promise.all([getLeaveRequests(), getSession()]);
  const base = session?.role === "HR" ? "/hr" : "/superadmin";

  const today = todayIso();
  const upcoming = [...requests]
    .filter((r) => (r.status === "Approved" || r.status === "Pending") && r.startDate >= today)
    .sort((a, b) => (a.startDate < b.startDate ? -1 : 1))
    .slice(0, 6);

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 4px" }}>Leave Calendar</h1>
        <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: 0 }}>
          Who's on approved or pending leave, by day.
        </p>
      </div>

      <div className={styles.filterRow}>
        {VIEWS.map((v) => (
          <Link
            key={v.key}
            href={withBase(base, `/leave/calendar?view=${v.key}&year=${year}&month=${month}`)}
            className={`${styles.filterButton} ${view === v.key ? styles.filterButtonActive : ""}`}
          >
            {v.label}
          </Link>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 260px", gap: 16, alignItems: "start" }}>
        <div>
          {view === "month" && <LeaveCalendar requests={requests} year={year} month={month} />}
          {view === "week" && <LeaveWeekView requests={requests} anchor={now} />}
          {view === "list" && <LeaveListView requests={requests} />}
        </div>
        <UpcomingLeavesPanel items={upcoming} />
      </div>
    </>
  );
}
