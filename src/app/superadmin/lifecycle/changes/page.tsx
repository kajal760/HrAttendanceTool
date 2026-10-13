import type { Metadata } from "next";
import { getEmployeeOverviews } from "@/lib/hr/employee-store";
import LifecycleModule from "@/components/hr/lifecycle/LifecycleModule";

export const metadata: Metadata = {
  title: "Lifecycle - Transfer & Promotion | HR Attendance",
};

export const dynamic = "force-dynamic";

export default async function LifecycleTransferPromotionPage() {
  const employees = await getEmployeeOverviews();

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 4px" }}>Transfer &amp; Promotion</h1>
        <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: 0 }}>
          Department transfers and designation promotions.
        </p>
      </div>
      <LifecycleModule employees={employees} tab="changes" />
    </>
  );
}
