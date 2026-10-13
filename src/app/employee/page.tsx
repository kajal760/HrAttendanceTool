import type { Metadata } from "next";
import Link from "next/link";
import {
  getAssetRequests,
  getAttendanceCalendar,
  getCompanyEvents,
  getCorrectionRequests,
  getEmployeeDashboardData,
  getRecentWorkHours,
  getUpcomingBirthdays,
  getUpcomingHolidays,
} from "@/lib/employee/mock-data";
import { getAnnouncements } from "@/lib/hr/announcement-store";
import { getEmployeeOverviews } from "@/lib/hr/employee-store";
import { getLeaveRequestsForEmployee } from "@/lib/hr/leave-store";
import { computeBalances } from "@/lib/hr/leave-balance";
import { getSettings } from "@/lib/hr/settings-store";
import { announcementStatus, resolveAudience } from "@/lib/announcements/status";
import { requireCurrentEmployee } from "@/lib/auth/current-employee";
import StatCard from "@/components/employee/StatCard";
import SectionCard from "@/components/employee/SectionCard";
import TaskSummaryList from "@/components/employee/TaskSummaryList";
import BirthdayList from "@/components/employee/BirthdayList";
import ClockHoursCard from "@/components/employee/ClockHoursCard";
import PendingRequestsCard from "@/components/employee/PendingRequestsCard";
import DashboardNoticeBanner from "@/components/employee/DashboardNoticeBanner";
import AttendanceCalendarWidget from "@/components/employee/AttendanceCalendarWidget";
import MonthlyStatsChart from "@/components/employee/MonthlyStatsChart";
import LeaveHolidaysCard from "@/components/employee/LeaveHolidaysCard";
import DashboardFeed, { type FeedItem } from "@/components/employee/DashboardFeed";
import EventsWidget from "@/components/employee/EventsWidget";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "My Dashboard | HR Attendance",
};

export const dynamic = "force-dynamic";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

const PRIORITY_RANK = { Urgent: 0, Important: 1, Normal: 2 } as const;

export default async function EmployeeDashboardPage() {
  const employee = await requireCurrentEmployee();
  const [
    { profile, tasks, history },
    birthdays,
    announcements,
    employees,
    corrections,
    leaveRequests,
    settings,
    assetRequests,
    calendar,
    monthlyHours,
    holidays,
    events,
  ] = await Promise.all([
    getEmployeeDashboardData(employee),
    getUpcomingBirthdays(),
    getAnnouncements(),
    getEmployeeOverviews(),
    getCorrectionRequests(),
    getLeaveRequestsForEmployee(employee.id),
    getSettings(),
    getAssetRequests(),
    getAttendanceCalendar(),
    getRecentWorkHours(),
    getUpcomingHolidays(),
    getCompanyEvents(),
  ]);

  const leave = computeBalances(leaveRequests, employee.id, settings.leaveYearStart);
  const activeTasks = tasks.counts.Pending + tasks.counts.Ongoing + tasks.counts.Overdue;

  // Same "what's actually live and addressed to me" filter the Announcements
  // page uses.
  const visibleAnnouncements = announcements
    .filter((a) => {
      const status = announcementStatus(a);
      if (status !== "Published" && status !== "Expired") return false;
      return resolveAudience(a.audience, employees).some((e) => e.id === employee.id);
    })
    .map((announcement) => ({
      announcement,
      isUnread: !announcement.reads.some((r) => r.employeeId === employee.id),
    }))
    .sort((a, b) => (a.announcement.publishAt < b.announcement.publishAt ? 1 : -1));

  // Top banner: the highest-priority unread notice, if any - not shown at
  // all when everything's been read.
  const noticeAnnouncement = [...visibleAnnouncements]
    .filter((a) => a.isUnread)
    .sort((a, b) => PRIORITY_RANK[a.announcement.priority] - PRIORITY_RANK[b.announcement.priority])[0]?.announcement;

  // "My Feed" - this employee's activity history merged with announcements
  // addressed to them, newest first.
  const feedItems: FeedItem[] = [
    ...history.map((h): FeedItem => ({ kind: "history", id: h.id, date: h.date, title: h.description, meta: h.meta, type: h.type })),
    ...visibleAnnouncements.map(
      ({ announcement, isUnread }): FeedItem => ({
        kind: "announcement",
        id: announcement.id,
        date: announcement.publishAt,
        title: announcement.title,
        meta: announcement.type,
        isUnread,
        href: `/employee/announcements/${announcement.id}`,
      }),
    ),
  ]
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 8);

  const pendingCorrections = corrections.filter((c) => c.status === "Pending").length;
  const pendingLeave = leaveRequests.filter((r) => r.status === "Pending").length;
  const pendingAssetRequests = assetRequests.filter((r) => r.status === "Pending").length;

  return (
    <>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.greeting}>
            {getGreeting()}, {profile.name.split(" ")[0]}
          </h1>
          <span className={styles.date}>
            {new Date().toLocaleDateString(undefined, {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}{" "}
            &middot; {profile.designation}
          </span>
        </div>
      </div>

      {noticeAnnouncement && <DashboardNoticeBanner announcement={noticeAnnouncement} />}

      <div className={styles.topRow}>
        <PendingRequestsCard
          attendanceCorrections={pendingCorrections}
          pendingLeave={pendingLeave}
          pendingAssetRequests={pendingAssetRequests}
          overdueTasks={tasks.counts.Overdue}
        />
        <div className={styles.attendanceCard}>
          <ClockHoursCard />
        </div>
      </div>

      <div className={styles.statGrid}>
        <StatCard label="Leave remaining" value={leave.totalRemaining} unit="days" tone="success" />
        <StatCard label="Leave used" value={leave.totalUsed} unit="days" tone="neutral" />
        <StatCard label="Active tasks" value={activeTasks} tone="info" />
        <StatCard label="Completed tasks" value={tasks.counts.Completed} tone="success" />
      </div>

      <div className={styles.boardGrid}>
        <div className={styles.boardCol}>
          <SectionCard
            title="Attendance"
            subtitle="This month"
            action={
              <Link href="/employee/attendance" className={styles.viewAll}>
                View all →
              </Link>
            }
          >
            <AttendanceCalendarWidget days={calendar} />
          </SectionCard>

          <SectionCard
            title="Monthly Stats"
            subtitle="Hours logged, last 7 days"
            action={
              <Link href="/employee/attendance/history" className={styles.viewAll}>
                Attendance history →
              </Link>
            }
          >
            <MonthlyStatsChart points={monthlyHours} />
          </SectionCard>
        </div>

        <div className={styles.boardCol}>
          <SectionCard
            title="Tasks"
            subtitle="Status overview and recent activity"
            action={
              <Link href="/employee/tasks" className={styles.viewAll}>
                View all →
              </Link>
            }
          >
            <TaskSummaryList counts={tasks.counts} recentTasks={tasks.recentTasks} />
          </SectionCard>

          <SectionCard title="Leaves & Holidays" subtitle={`${leave.totalAllocated} days allocated this year`}>
            <LeaveHolidaysCard balances={leave.byType} holidays={holidays} />
          </SectionCard>
        </div>

        <div className={styles.boardCol}>
          <SectionCard title="My Feed" subtitle="Recent activity and announcements">
            <DashboardFeed items={feedItems} />
          </SectionCard>

          <SectionCard title="Events" subtitle="Upcoming across the company">
            <EventsWidget events={events} />
          </SectionCard>

          <SectionCard title="Upcoming birthdays" subtitle="Across the company">
            <BirthdayList items={birthdays} />
          </SectionCard>
        </div>
      </div>
    </>
  );
}
