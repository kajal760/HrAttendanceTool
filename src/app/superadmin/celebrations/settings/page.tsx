import type { Metadata } from "next";
import { getSettings } from "@/lib/hr/settings-store";
import CelebrationEmailSettings from "@/components/hr/CelebrationEmailSettings";

export const metadata: Metadata = {
  title: "Celebration Email Settings | HR Attendance",
};

export const dynamic = "force-dynamic";

export default async function CelebrationsSettingsPage() {
  const settings = await getSettings();

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 4px" }}>Email Settings</h1>
        <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: 0 }}>
          Turn birthday and work anniversary emails on or off.
        </p>
      </div>
      <CelebrationEmailSettings initial={settings.celebrations} />
    </>
  );
}
