import type { Metadata } from "next";
import { getEmployeeOverviews } from "@/lib/hr/employee-store";
import EmployeeGrid from "@/components/hr/EmployeeGrid";

export const metadata: Metadata = {
  title: "Employee Directory | HumSetu",
};

interface EmployeeDirectoryPageProps {
  searchParams: Promise<{ department?: string }>;
}

export default async function EmployeeDirectoryPage({ searchParams }: EmployeeDirectoryPageProps) {
  const [employees, { department }] = await Promise.all([getEmployeeOverviews(), searchParams]);

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 4px" }}>Employee Directory</h1>
        <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: 0 }}>
          Click a card for a quick summary - performance, attendance, leave, tasks, and pending requests.
        </p>
      </div>
      <EmployeeGrid employees={employees} initialDepartmentFilter={department} />
    </>
  );
}
