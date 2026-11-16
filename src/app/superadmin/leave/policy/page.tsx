import type { Metadata } from "next";
import { getSettings } from "@/lib/hr/settings-store";
import { getLeaveTypesAdmin } from "@/lib/hr/leave-store";
import LeavePoliciesView from "@/components/hr/leave/LeavePoliciesView";

export const metadata: Metadata = {
  title: "Leave Policies | HumSetu",
};

export const dynamic = "force-dynamic";

export default async function SuperAdminLeavePolicyPage() {
  const [settings, types] = await Promise.all([getSettings(), getLeaveTypesAdmin()]);

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 4px" }}>Leave Policies</h1>
        <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: 0 }}>
          Configure leave rules and entitlements.
        </p>
      </div>
      <LeavePoliciesView types={types} leaveYearStart={settings.leaveYearStart} />
    </>
  );
}
