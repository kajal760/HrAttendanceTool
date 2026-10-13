import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAnnouncement } from "@/lib/hr/announcement-store";
import { getEmployeeOverviews } from "@/lib/hr/employee-store";
import AnnouncementDetail from "@/components/hr/AnnouncementDetail";

export const metadata: Metadata = {
  title: "Announcement | HR Attendance",
};

export const dynamic = "force-dynamic";

export default async function AnnouncementDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [announcement, employees] = await Promise.all([getAnnouncement(id), getEmployeeOverviews()]);
  if (!announcement) notFound();

  return <AnnouncementDetail announcement={announcement} employees={employees} />;
}
