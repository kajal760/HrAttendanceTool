import type { Metadata } from "next";
import { getEmployeeOverviews } from "@/lib/hr/employee-store";
import AnnouncementForm from "@/components/hr/AnnouncementForm";

export const metadata: Metadata = {
  title: "Create Announcement | HR Attendance",
};

export default async function NewAnnouncementPage() {
  const employees = await getEmployeeOverviews();

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 4px" }}>Create Announcement</h1>
        <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: 0 }}>
          Publish immediately, schedule for later, or save as a draft.
        </p>
      </div>
      <AnnouncementForm mode="create" employees={employees} />
    </>
  );
}
