import type { Metadata } from "next";
import { getEmployeeOverviews } from "@/lib/hr/employee-store";
import LifecycleModule from "@/components/hr/lifecycle/LifecycleModule";

export const metadata: Metadata = {
  title: "Lifecycle - Separation | HR Attendance",
};

export const dynamic = "force-dynamic";

export default async function LifecycleSeparationPage() {
  const employees = await getEmployeeOverviews();

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 4px" }}>Separation</h1>
        <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: 0 }}>
          Notice period, handover, and exit clearance.
        </p>
      </div>
      <LifecycleModule employees={employees} tab="separation" />
    </>
  );
}
