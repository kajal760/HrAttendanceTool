import type { Metadata } from "next";
import Link from "next/link";
import { getHrDashboardData } from "@/lib/hr/mock-data";
import { getEmployeeOverviews } from "@/lib/hr/employee-store";
import { getProjects, getTasks } from "@/lib/hr/work-store";
import { getUpcomingBirthdays } from "@/lib/employee/mock-data";
import SummaryCard from "@/components/hr/SummaryCard";
import LineTrendChart from "@/components/hr/LineTrendChart";
import CategoryBarChart, { CategoryBarChartLegend } from "@/components/hr/CategoryBarChart";
import CategoryChipRow from "@/components/hr/CategoryChipRow";
import DepartmentOverviewTable from "@/components/hr/DepartmentOverviewTable";
import RecentActivityList from "@/components/hr/RecentActivityList";
import HomeQuickActions from "@/components/hr/HomeQuickActions";
import SectionCard from "@/components/employee/SectionCard";
import type { CategoryChip } from "@/components/hr/CategoryChipRow";
import ManagerClockCard from "@/components/hr/ManagerClockCard";
import { getSession } from "@/lib/auth/get-session";
import { getTodayRecord } from "@/lib/hr/attendance-store";
import BirthdayList from "@/components/employee/BirthdayList";
import { withBase } from "@/lib/portal";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "HR Dashboard | HR Attendance",
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

export default async function HrHomePage() {
  const session = await getSession();
  const base = session?.role === "HR" ? "/hr" : "/superadmin";
  const [dashboard, birthdays, employees, projects, tasks, clockRecord] = await Promise.all([
    getHrDashboardData(),
    getUpcomingBirthdays(5),
    getEmployeeOverviews(),
    getProjects(),
    getTasks(),
    session ? getTodayRecord(session.userId) : Promise.resolve(null),
  ]);

  return (
    <>
      <div className={styles.pageHeader}>
        <h1 className={styles.title}>Home</h1>
        <p className={styles.subtitle}>Company-wide attendance, requests, projects, and task activity.</p>
      </div>

      <ManagerClockCard initial={clockRecord} />

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
              <CategoryBarChart data={dashboard.requestsByType} />
              <CategoryBarChartLegend data={dashboard.requestsByType} />
            </SectionCard>
          </div>

          <SectionCard title="Projects & tasks" subtitle="Company-wide status">
            <div className={styles.projectTaskRow}>
              <div>
                <span className={styles.subheading}>Projects</span>
                <CategoryChipRow
                  items={[
                    { label: "Active", value: dashboard.projectStatusCounts.Active, tone: "info" },
                    { label: "Completed", value: dashboard.projectStatusCounts.Completed, tone: "success" },
                    { label: "Upcoming", value: dashboard.projectStatusCounts.Upcoming, tone: "neutral" },
                    { label: "Delayed", value: dashboard.projectStatusCounts.Delayed, tone: "danger" },
                  ]}
                />
              </div>
              <div>
                <span className={styles.subheading}>Tasks</span>
                <CategoryChipRow
                  items={[
                    { label: "Completed", value: dashboard.taskStatusBreakdown.Completed, tone: "success" },
                    { label: "Ongoing", value: dashboard.taskStatusBreakdown.Ongoing, tone: "warning" },
                    { label: "Pending", value: dashboard.taskStatusBreakdown.Pending, tone: "info" },
                    { label: "Overdue", value: dashboard.taskStatusBreakdown.Overdue, tone: "danger" },
                  ]}
                />
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Department overview" subtitle="Click a department to see its roster">
            <DepartmentOverviewTable rows={dashboard.departmentOverview} />
          </SectionCard>
        </div>

        <div className={styles.rightCol}>
          <SectionCard title="Quick actions">
            <HomeQuickActions employees={employees} projects={projects} tasks={tasks} />
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
