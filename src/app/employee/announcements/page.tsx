import type { Metadata } from "next";
import { getAnnouncements } from "@/lib/hr/announcement-store";
import { getEmployeeOverviews } from "@/lib/hr/employee-store";
import { requireCurrentEmployee } from "@/lib/auth/current-employee";
import { announcementStatus, resolveAudience } from "@/lib/announcements/status";
import EmployeeAnnouncementCard from "@/components/employee/EmployeeAnnouncementCard";

export const metadata: Metadata = {
  title: "Announcements | HR Attendance",
};

export const dynamic = "force-dynamic";

export default async function EmployeeAnnouncementsPage() {
  const [me, announcements, employees] = await Promise.all([
    requireCurrentEmployee(),
    getAnnouncements(),
    getEmployeeOverviews(),
  ]);

  // Only what's actually live and actually targets this employee - never
  // drafts, future-scheduled, or archived notices.
  const visible = announcements
    .filter((a) => {
      const status = announcementStatus(a);
      if (status !== "Published" && status !== "Expired") return false;
      return resolveAudience(a.audience, employees).some((e) => e.id === me.id);
    })
    .sort((a, b) => (a.publishAt < b.publishAt ? 1 : -1));

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 4px" }}>Announcements</h1>
        <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: 0 }}>
          Company, department, and team notices addressed to you.
        </p>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {visible.length === 0 && (
          <p style={{ fontSize: 13, color: "var(--color-text-muted)" }}>No announcements right now.</p>
        )}
        {visible.map((a) => (
          <EmployeeAnnouncementCard
            key={a.id}
            announcement={a}
            isUnread={!a.reads.some((r) => r.employeeId === me.id)}
            needsAcknowledgement={
              a.requireAcknowledgement && !a.acknowledgements.some((ack) => ack.employeeId === me.id)
            }
          />
        ))}
      </div>
    </>
  );
}
