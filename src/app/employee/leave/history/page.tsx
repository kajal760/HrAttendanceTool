import type { Metadata } from "next";
import { getLeaveRequestsForEmployee } from "@/lib/hr/leave-store";
import { requireCurrentEmployee } from "@/lib/auth/current-employee";
import SectionCard from "@/components/employee/SectionCard";
import LeaveHistoryList from "@/components/employee/LeaveHistoryList";

export const metadata: Metadata = {
  title: "Leave History | HR Attendance",
};

export const dynamic = "force-dynamic";

export default async function EmployeeLeaveHistoryPage() {
  const employee = await requireCurrentEmployee();
  const requests = await getLeaveRequestsForEmployee(employee.id);

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 4px" }}>Leave History</h1>
        <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: 0 }}>
          Your previous leave applications and their approval status.
        </p>
      </div>

      <SectionCard title="Your leave requests" subtitle="Pending / Approved / Rejected">
        <LeaveHistoryList requests={requests} />
      </SectionCard>
    </>
  );
}
