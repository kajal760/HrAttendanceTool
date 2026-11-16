import type { Metadata } from "next";
import { getAnnouncements } from "@/lib/hr/announcement-store";
import { getEmployeeOverviews } from "@/lib/hr/employee-store";
import AnnouncementList from "@/components/hr/AnnouncementList";

export const metadata: Metadata = {
  title: "Announcements | HumSetu",
};

export const dynamic = "force-dynamic";

export default async function SuperAdminAnnouncementsPage() {
  const [announcements, employees] = await Promise.all([getAnnouncements(), getEmployeeOverviews()]);

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 4px" }}>Announcements</h1>
        <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: 0 }}>
          Company, department, team, or individual notices - with read tracking.
        </p>
      </div>
      <AnnouncementList announcements={announcements} employees={employees} />
    </>
  );
}
