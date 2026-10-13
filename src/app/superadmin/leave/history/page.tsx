import type { Metadata } from "next";
import { getLeaveRequests } from "@/lib/hr/leave-store";
import { getEmployeeOverviews } from "@/lib/hr/employee-store";
import LeaveHistoryTable from "@/components/hr/leave/LeaveHistoryTable";

export const metadata: Metadata = {
  title: "Leave History | HR Attendance",
};

export const dynamic = "force-dynamic";

export default async function SuperAdminLeaveHistoryPage() {
  const [requests, employees] = await Promise.all([getLeaveRequests(), getEmployeeOverviews()]);

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 4px" }}>Leave History</h1>
        <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: 0 }}>
          Every leave request that's already been decided, company-wide.
        </p>
      </div>
      <LeaveHistoryTable requests={requests} employees={employees} />
    </>
  );
}
