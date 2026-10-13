import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAnnouncement } from "@/lib/hr/announcement-store";
import { getEmployeeOverviews } from "@/lib/hr/employee-store";
import AnnouncementForm from "@/components/hr/AnnouncementForm";

export const metadata: Metadata = {
  title: "Edit Announcement | HR Attendance",
};

export const dynamic = "force-dynamic";

export default async function EditAnnouncementPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [announcement, employees] = await Promise.all([getAnnouncement(id), getEmployeeOverviews()]);
  if (!announcement) notFound();

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 4px" }}>Edit Announcement</h1>
        <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: 0 }}>
          Publish/archive actions live on the announcement's detail page.
        </p>
      </div>
      <AnnouncementForm mode="edit" announcement={announcement} employees={employees} />
    </>
  );
}
