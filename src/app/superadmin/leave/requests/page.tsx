import type { Metadata } from "next";
import { getLeaveRequests } from "@/lib/hr/leave-store";
import { getEmployeeOverviews } from "@/lib/hr/employee-store";
import LeaveRequestsTable from "@/components/hr/leave/LeaveRequestsTable";

export const metadata: Metadata = {
  title: "Leave Requests | HumSetu",
};

export const dynamic = "force-dynamic";

export default async function SuperAdminLeaveRequestsPage() {
  const [requests, employees] = await Promise.all([getLeaveRequests(), getEmployeeOverviews()]);

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 4px" }}>Leave Requests</h1>
        <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: 0 }}>
          Review and manage employee leave applications.
        </p>
      </div>
      <LeaveRequestsTable requests={requests} employees={employees} />
    </>
  );
}
