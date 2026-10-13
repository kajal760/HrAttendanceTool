import type { Metadata } from "next";
import { getAssetRequests, getRequestRecipients } from "@/lib/employee/mock-data";
import { getLeaveRequestsForEmployee } from "@/lib/hr/leave-store";
import { requireCurrentEmployee } from "@/lib/auth/current-employee";
import SectionCard from "@/components/employee/SectionCard";
import HrRequestPanel from "@/components/employee/HrRequestPanel";
import AllRequestsHistory from "@/components/employee/AllRequestsHistory";

export const metadata: Metadata = {
  title: "Requests | HR Attendance",
};

export const dynamic = "force-dynamic";

export default async function EmployeeRequestsPage() {
  const employee = await requireCurrentEmployee();
  const [recipients, leaveRequests, assetRequests] = await Promise.all([
    getRequestRecipients(),
    getLeaveRequestsForEmployee(employee.id),
    getAssetRequests(),
  ]);

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 4px" }}>
          Requests
        </h1>
        <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: 0 }}>
          Contact HR, the CFO, or a colleague for leave, work mode changes,
          queries, and more.
        </p>
      </div>

      <div style={{ marginBottom: 16 }}>
        <SectionCard
          title="Raise a request"
          subtitle="Pick a type, mention who it should go to, and add a summary"
        >
          <HrRequestPanel recipientOptions={recipients} initialRequests={[]} />
        </SectionCard>
      </div>

      <SectionCard
        title="All requests"
        subtitle="Every request you've raised - leave, assets, work from home, and more - filterable by type"
      >
        <AllRequestsHistory
          leaveRequests={leaveRequests}
          initialAssetRequests={assetRequests}
          initialHrRequests={[]}
        />
      </SectionCard>
    </>
  );
}
