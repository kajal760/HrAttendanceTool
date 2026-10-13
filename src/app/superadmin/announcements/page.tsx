import type { Metadata } from "next";
import { getAnnouncements } from "@/lib/hr/announcement-store";
import { getEmployeeOverviews } from "@/lib/hr/employee-store";
import { announcementStatus, STATUS_FILTERS } from "@/lib/announcements/status";
import type { AnnouncementStatus } from "@/types/announcement";
import AnnouncementList from "@/components/hr/AnnouncementList";

export const metadata: Metadata = {
  title: "Announcements | HR Attendance",
};

function isStatus(value: string): value is AnnouncementStatus {
  return (STATUS_FILTERS as string[]).includes(value);
}

interface SuperAdminAnnouncementsPageProps {
  searchParams: Promise<{ status?: string }>;
}

export default async function SuperAdminAnnouncementsPage({ searchParams }: SuperAdminAnnouncementsPageProps) {
  const [announcements, employees, { status }] = await Promise.all([
    getAnnouncements(),
    getEmployeeOverviews(),
    searchParams,
  ]);

  const filtered = status && isStatus(status) ? announcements.filter((a) => announcementStatus(a) === status) : announcements;

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 4px" }}>Announcements</h1>
        <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: 0 }}>
          Company, department, team, or individual notices - with read and acknowledgement tracking.
        </p>
      </div>
      <AnnouncementList announcements={filtered} employees={employees} />
    </>
  );
}
