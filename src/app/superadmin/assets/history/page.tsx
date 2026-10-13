import type { Metadata } from "next";
import { getAssetEvents } from "@/lib/hr/asset-store";
import { getEmployeeOverviews } from "@/lib/hr/employee-store";
import AssetHistoryFeed from "@/components/hr/assets/AssetHistoryFeed";

export const metadata: Metadata = {
  title: "Asset History | HR Attendance",
};

export const dynamic = "force-dynamic";

export default async function AssetHistoryPage() {
  const [events, employees] = await Promise.all([getAssetEvents(), getEmployeeOverviews()]);
  const employeeNames = Object.fromEntries(employees.map((e) => [e.id, e.name]));

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 4px" }}>Asset History</h1>
        <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: 0 }}>
          Every allocation, return, repair, and retirement, across all assets.
        </p>
      </div>
      <AssetHistoryFeed events={events} employeeNames={employeeNames} />
    </>
  );
}
