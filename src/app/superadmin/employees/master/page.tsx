import type { Metadata } from "next";
import { getEmployeeOverviews } from "@/lib/hr/employee-store";
import EmployeeMasterTable from "@/components/hr/EmployeeMasterTable";

export const metadata: Metadata = {
  title: "Employee Master | HR Attendance",
};

export const dynamic = "force-dynamic";

export default async function EmployeeMasterPage() {
  const employees = await getEmployeeOverviews();

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 4px" }}>Employee Master</h1>
        <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: 0 }}>
          A flat, searchable view of every employee's master record - click a name for the full profile.
        </p>
      </div>
      <EmployeeMasterTable employees={employees} />
    </>
  );
}
