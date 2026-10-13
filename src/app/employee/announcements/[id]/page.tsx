import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAnnouncement } from "@/lib/hr/announcement-store";
import { getEmployeeOverviews } from "@/lib/hr/employee-store";
import { requireCurrentEmployee } from "@/lib/auth/current-employee";
import { announcementStatus, resolveAudience } from "@/lib/announcements/status";
import EmployeeAnnouncementReader from "@/components/employee/EmployeeAnnouncementReader";

export const metadata: Metadata = {
  title: "Announcement | HR Attendance",
};

export const dynamic = "force-dynamic";

export default async function EmployeeAnnouncementPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [me, announcement, employees] = await Promise.all([
    requireCurrentEmployee(),
    getAnnouncement(id),
    getEmployeeOverviews(),
  ]);
  if (!announcement) notFound();

  const status = announcementStatus(announcement);
  const isVisible =
    (status === "Published" || status === "Expired") &&
    resolveAudience(announcement.audience, employees).some((e) => e.id === me.id);
  if (!isVisible) notFound();

  return <EmployeeAnnouncementReader announcement={announcement} employeeId={me.id} />;
}
