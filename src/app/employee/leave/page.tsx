import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { getLeaveRequestsForEmployee, getLeaveSummary } from "@/lib/hr/leave-store";
import { LEAVE_WARNING_THRESHOLD } from "@/lib/hr/leave-balance";
import { requireCurrentEmployee } from "@/lib/auth/current-employee";
import SectionCard from "@/components/employee/SectionCard";
import LeaveLimitAlert from "@/components/employee/LeaveLimitAlert";
import LeaveCategoryDonutGrid from "@/components/employee/LeaveCategoryDonutGrid";
import LeaveHistorySection from "@/components/employee/LeaveHistorySection";

export const metadata: Metadata = {
  title: "Leave | HumSetu",
};

export const dynamic = "force-dynamic";

// The Leave tab of the combined Attendance & Leave section: a Chart.js
// summary (allocated vs used per category), a Chart.js history graph that
// toggles to the existing table view (LeaveHistorySection), and an Apply
// for Leave button that hands off to the dedicated apply form page rather
// than embedding it here.
export default async function EmployeeLeavePage() {
  const employee = await requireCurrentEmployee();
  const [requests, leave] = await Promise.all([
    getLeaveRequestsForEmployee(employee.id),
    getLeaveSummary(employee.id),
  ]);

  return (
    <>
      <LeaveLimitAlert percentUsed={leave.percentUsed} totalRemaining={leave.totalRemaining} threshold={LEAVE_WARNING_THRESHOLD} />

      <div style={{ marginBottom: 20, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 4px" }}>Leave</h1>
          <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: 0 }}>
            Your leave summary, history, and balance by type.
          </p>
        </div>
        <Link
          href="/employee/leave/apply"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 13,
            fontWeight: 600,
            padding: "9px 16px",
            borderRadius: "var(--radius-sm)",
            background: "var(--color-hr-cta)",
            color: "var(--color-hr-cta-contrast)",
            textDecoration: "none",
            whiteSpace: "nowrap",
          }}
        >
          <Plus size={15} strokeWidth={2.5} /> Apply for Leave
        </Link>
      </div>

      <div style={{ marginBottom: 16 }}>
        <SectionCard
          title="Leave summary"
          subtitle={`${leave.totalUsed} of ${leave.totalAllocated} days used · ${leave.totalRemaining} remaining`}
        >
          <LeaveCategoryDonutGrid items={leave.byType} />
        </SectionCard>
      </div>

      <SectionCard title="Leave history" subtitle="Last 6 months as a graph, or switch to the full table">
        <LeaveHistorySection requests={requests} />
      </SectionCard>
    </>
  );
}
