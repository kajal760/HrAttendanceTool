import type { Metadata } from "next";
import { getUpcomingAnniversaries } from "@/lib/hr/anniversaries";
import AnniversaryList from "@/components/hr/AnniversaryList";

export const metadata: Metadata = {
  title: "Work Anniversaries | HR Attendance",
};

export const dynamic = "force-dynamic";

export default async function CelebrationsAnniversariesPage() {
  const anniversaries = await getUpcomingAnniversaries(50, 365);

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 4px" }}>Work Anniversaries</h1>
        <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: 0 }}>
          Upcoming work anniversaries, by years of service - same automated 10:00 AM email as birthdays.
        </p>
      </div>
      <AnniversaryList items={anniversaries} />
    </>
  );
}
