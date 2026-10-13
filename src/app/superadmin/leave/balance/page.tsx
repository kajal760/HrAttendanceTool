import type { Metadata } from "next";
import { getLeaveRequests } from "@/lib/hr/leave-store";
import { getEmployeeOverviews } from "@/lib/hr/employee-store";
import { getSettings } from "@/lib/hr/settings-store";
import LeaveBalanceTable from "@/components/hr/leave/LeaveBalanceTable";

export const metadata: Metadata = {
  title: "Leave Balance | HR Attendance",
};

export const dynamic = "force-dynamic";

export default async function SuperAdminLeaveBalancePage() {
  const [requests, employees, settings] = await Promise.all([
    getLeaveRequests(),
    getEmployeeOverviews(),
    getSettings(),
  ]);

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 4px" }}>Leave Balance</h1>
        <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: 0 }}>
          Allocated, used, and remaining leave by employee for the current leave year.
        </p>
      </div>
      <LeaveBalanceTable requests={requests} employees={employees} leaveYearStart={settings.leaveYearStart} />
    </>
  );
}
