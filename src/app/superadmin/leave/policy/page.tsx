import type { Metadata } from "next";
import { getSettings } from "@/lib/hr/settings-store";
import LeavePolicyForm from "@/components/hr/leave/LeavePolicyForm";

export const metadata: Metadata = {
  title: "Leave Policy | HR Attendance",
};

export const dynamic = "force-dynamic";

export default async function SuperAdminLeavePolicyPage() {
  const settings = await getSettings();

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 4px" }}>Leave Policy</h1>
        <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: 0 }}>
          The leave year used to calculate every employee's balance.
        </p>
      </div>
      <LeavePolicyForm leaveYearStart={settings.leaveYearStart} />
    </>
  );
}
