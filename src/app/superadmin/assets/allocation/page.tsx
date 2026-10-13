import type { Metadata } from "next";
import { getAssets } from "@/lib/hr/asset-store";
import { getEmployeeOverviews } from "@/lib/hr/employee-store";
import AssetsView from "@/components/hr/assets/AssetsView";

export const metadata: Metadata = {
  title: "Asset Allocation | HR Attendance",
};

export const dynamic = "force-dynamic";

export default async function AssetAllocationPage() {
  const [assets, employees] = await Promise.all([getAssets(), getEmployeeOverviews()]);
  const people = employees
    .filter((e) => !e.exit?.deletedOn)
    .map((e) => ({ id: e.id, name: e.name, employeeCode: e.employeeCode, department: e.department }));

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 4px" }}>Allocation</h1>
        <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: 0 }}>
          Available assets, ready to assign.
        </p>
      </div>
      <AssetsView initialAssets={assets} people={people} view="allocation" />
    </>
  );
}
