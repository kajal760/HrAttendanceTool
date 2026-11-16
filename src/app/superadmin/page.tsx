import type { Metadata } from "next";
import Link from "next/link";
import { getHrDashboardData } from "@/lib/hr/dashboard-data";
import { getUpcomingBirthdays } from "@/lib/employee/dashboard-data";
import SummaryCard from "@/components/hr/SummaryCard";
import LineTrendChart from "@/components/hr/LineTrendChart";
import AssetStatusDonut from "@/components/hr/assets/AssetStatusDonut";
import CategoryChipRow from "@/components/hr/CategoryChipRow";
import DepartmentOverviewTable from "@/components/hr/DepartmentOverviewTable";
import RecentActivityList from "@/components/hr/RecentActivityList";
import HomeQuickActions from "@/components/hr/HomeQuickActions";
import SectionCard from "@/components/employee/SectionCard";
import type { CategoryChip } from "@/components/hr/CategoryChipRow";
import { getSession } from "@/lib/auth/get-session";
import BirthdayList from "@/components/employee/BirthdayList";
import { withBase } from "@/lib/portal";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "HR Dashboard | HumSetu",
};

// These are states, not arbitrary categories - status tokens (reserved
// meaning) apply, not the categorical series palette. Present is good, Late
// and Absent get progressively more urgent tones, WFH/On Leave are
// informational rather than good/bad.
const ATTENDANCE_TONE: Record<string, CategoryChip["tone"]> = {
  Present: "success",
  WFH: "info",
  "On Leave": "info",
  Late: "warning",
  Absent: "danger",
};

// Fixed per-status tones (reserved meaning), not the categorical series
// palette - same reasoning as ATTENDANCE_TONE above, just resolved to
// literal hex since these feed a <canvas> donut rather than a CSS class.
const PROJECT_STATUS_COLOR: Record<string, string> = {
  Active: "#4a3aa7",
  Completed: "#1a8a4a",
  Upcoming: "#666d76",
  Delayed: "#c62828",
};
const TASK_STATUS_COLOR: Record<string, string> = {
  Completed: "#1a8a4a",
  Ongoing: "#b96b00",
  Pending: "#4a3aa7",
  Overdue: "#c62828",
};
const REQUEST_TYPE_COLORS = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#4a3aa7", "#e34948"];

export default async function HrHomePage() {
  const session = await getSession();
  const base = session?.role === "HR" ? "/hr" : "/superadmin";
  const [dashboard, birthdays] = await Promise.all([getHrDashboardData(), getUpcomingBirthdays(5)]);

  const requestSlices = dashboard.requestsByType.map((r, i) => ({
    label: r.label,
    value: r.value,
    color: REQUEST_TYPE_COLORS[i % REQUEST_TYPE_COLORS.length],
  }));
  const projectSlices = [
    { label: "Active", value: dashboard.projectStatusCounts.Active, color: PROJECT_STATUS_COLOR.Active },
    { label: "Completed", value: dashboard.projectStatusCounts.Completed, color: PROJECT_STATUS_COLOR.Completed },
    { label: "Upcoming", value: dashboard.projectStatusCounts.Upcoming, color: PROJECT_STATUS_COLOR.Upcoming },
    { label: "Delayed", value: dashboard.projectStatusCounts.Delayed, color: PROJECT_STATUS_COLOR.Delayed },
  ].filter((s) => s.value > 0);
  const taskSlices = [
    { label: "Completed", value: dashboard.taskStatusBreakdown.Completed, color: TASK_STATUS_COLOR.Completed },
    { label: "Ongoing", value: dashboard.taskStatusBreakdown.Ongoing, color: TASK_STATUS_COLOR.Ongoing },
    { label: "Pending", value: dashboard.taskStatusBreakdown.Pending, color: TASK_STATUS_COLOR.Pending },
    { label: "Overdue", value: dashboard.taskStatusBreakdown.Overdue, color: TASK_STATUS_COLOR.Overdue },
  ].filter((s) => s.value > 0);

  return (
    <>
      <div className={styles.pageHeader}>
        <h1 className={styles.title}>Home</h1>
        <p className={styles.subtitle}>Company-wide attendance, requests, projects, and task activity.</p>
      </div>

      <div className={styles.statGrid}>
        {dashboard.summaryCards.map((card) => (
          <SummaryCard key={card.id} {...card} />
        ))}
      </div>

      <div className={styles.layout}>
        <div className={styles.leftCol}>
          <div className={styles.chartRow}>
            <SectionCard title="Attendance overview" subtitle="Trend over the last 6 months">
              <LineTrendChart data={dashboard.attendanceTrend} />
              <div className={styles.chipSpacer}>
                <CategoryChipRow
                  items={dashboard.attendanceBreakdown.map((c) => ({
                    label: c.label,
                    value: c.value,
                    tone: ATTENDANCE_TONE[c.label],
                  }))}
                />
              </div>
            </SectionCard>
            <SectionCard title="Requests by type" subtitle="This month">
              <AssetStatusDonut data={requestSlices} />
            </SectionCard>
          </div>

          <SectionCard title="Projects & tasks" subtitle="Company-wide status">
            <div className={styles.projectTaskRow}>
              <div>
                <span className={styles.subheading}>Projects</span>
                <AssetStatusDonut data={projectSlices} />
              </div>
              <div>
                <span className={styles.subheading}>Tasks</span>
                <AssetStatusDonut data={taskSlices} />
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Department overview" subtitle="Click a department to see its roster">
            <DepartmentOverviewTable rows={dashboard.departmentOverview} />
          </SectionCard>
        </div>

        <div className={styles.rightCol}>
          <SectionCard title="Quick actions">
            <HomeQuickActions />
          </SectionCard>

          <SectionCard title="Recent activity">
            <RecentActivityList items={dashboard.recentActivity} />
            <Link href={withBase(base, "/log")} className={styles.viewAllLink}>
              View all activity →
            </Link>
          </SectionCard>

          <SectionCard title="Upcoming birthdays" subtitle="Across the company">
            <BirthdayList items={birthdays} />
          </SectionCard>
        </div>
      </div>
    </>
  );
}
