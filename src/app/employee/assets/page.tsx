import type { Metadata } from "next";
import {
  getAssetHistory,
  getAssetRequests,
  getMyAssets,
  getSoftwareLicenses,
} from "@/lib/employee/mock-data";
import SectionCard from "@/components/employee/SectionCard";
import AssetTable from "@/components/employee/AssetTable";
import LicenseTable from "@/components/employee/LicenseTable";
import AssetHistoryTable from "@/components/employee/AssetHistoryTable";
import AssetRequestPanel from "@/components/employee/AssetRequestPanel";

export const metadata: Metadata = {
  title: "Assets | HR Attendance",
};

export default async function EmployeeAssetsPage() {
  const [assets, licenses, history, requests] = await Promise.all([
    getMyAssets(),
    getSoftwareLicenses(),
    getAssetHistory(),
    getAssetRequests(),
  ]);

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 4px" }}>
          Assets
        </h1>
        <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: 0 }}>
          Devices, cards, and software licenses assigned to you.
        </p>
      </div>

      <div style={{ marginBottom: 16 }}>
        <SectionCard title="My assets" subtitle="Laptop, phone, ID card, and access card">
          <AssetTable assets={assets} />
        </SectionCard>
      </div>

      <div style={{ marginBottom: 16 }}>
        <SectionCard title="Software licenses" subtitle="Seats assigned to your account">
          <LicenseTable licenses={licenses} />
        </SectionCard>
      </div>

      <div style={{ marginBottom: 16 }}>
        <SectionCard title="Asset history" subtitle="Allocation, return, and issue log">
          <AssetHistoryTable entries={history} />
        </SectionCard>
      </div>

      <SectionCard
        title="Requests"
        subtitle="Ask for a new asset, report it lost or faulty, or request a return/replacement"
      >
        <AssetRequestPanel assets={assets} initialRequests={requests} />
      </SectionCard>
    </>
  );
}
