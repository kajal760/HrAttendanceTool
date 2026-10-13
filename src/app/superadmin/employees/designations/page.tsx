import type { Metadata } from "next";
import { getOrgRegistry } from "@/lib/hr/org-registry-store";
import OrgRegistryManager from "@/components/hr/OrgRegistryManager";

export const metadata: Metadata = {
  title: "Designations | HR Attendance",
};

export const dynamic = "force-dynamic";

export default async function DesignationsPage() {
  const designations = await getOrgRegistry("designations");

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 4px" }}>Designations</h1>
        <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: 0 }}>
          Manage the designation registry used across employee records.
        </p>
      </div>
      <div style={{ maxWidth: 420 }}>
        <OrgRegistryManager resource="designations" title="Designations" initialItems={designations} />
      </div>
    </>
  );
}
