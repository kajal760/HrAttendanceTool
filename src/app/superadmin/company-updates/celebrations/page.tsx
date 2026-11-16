import type { Metadata } from "next";
import { getCelebrations } from "@/lib/hr/celebrations";
import { getSettings } from "@/lib/hr/settings-store";
import CelebrationsBoard from "@/components/hr/CelebrationsBoard";
import CelebrationEmailSettings from "@/components/hr/CelebrationEmailSettings";
import SectionCard from "@/components/employee/SectionCard";

export const metadata: Metadata = {
  title: "Celebrations | HumSetu",
};

export const dynamic = "force-dynamic";

export default async function CelebrationsPage() {
  const [entries, settings] = await Promise.all([getCelebrations(), getSettings()]);

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 4px" }}>Birthdays &amp; Work Anniversaries</h1>
        <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: 0 }}>
          Upcoming birthdays, work anniversaries, and new joiners across the company.
        </p>
      </div>
      <CelebrationsBoard entries={entries} />
      <SectionCard title="Notifications" subtitle="Automated birthday and anniversary emails">
        <CelebrationEmailSettings initial={settings.celebrations} />
      </SectionCard>
    </>
  );
}
