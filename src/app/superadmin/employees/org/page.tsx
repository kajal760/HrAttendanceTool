import type { Metadata } from "next";
import { getOrgChartData } from "@/lib/hr/mock-data";
import { getOrgRegistry } from "@/lib/hr/org-registry-store";
import OrgChart from "@/components/hr/OrgChart";
import OrgRegistryManager from "@/components/hr/OrgRegistryManager";

export const metadata: Metadata = {
  title: "Org Structure | HR Attendance",
};

export const dynamic = "force-dynamic";

export default async function OrgStructurePage() {
  const [data, departments, designations, locations] = await Promise.all([
    getOrgChartData(),
    getOrgRegistry("departments"),
    getOrgRegistry("designations"),
    getOrgRegistry("locations"),
  ]);

  return (
    <>
      <div style={{ marginBottom: 20, textAlign: "center" }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 4px" }}>
          Org Structure
        </h1>
        <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: 0 }}>
          Manage departments, designations, and locations below - scroll down to reveal each department in the chart.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 14,
          marginBottom: 28,
        }}
      >
        <OrgRegistryManager resource="departments" title="Departments" initialItems={departments} />
        <OrgRegistryManager resource="designations" title="Designations" initialItems={designations} />
        <OrgRegistryManager resource="locations" title="Locations" initialItems={locations} />
      </div>

      <OrgChart data={data} />
    </>
  );
}
