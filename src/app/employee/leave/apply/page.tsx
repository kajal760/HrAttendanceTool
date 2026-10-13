import type { Metadata } from "next";
import SectionCard from "@/components/employee/SectionCard";
import LeaveApplyForm from "@/components/employee/LeaveApplyForm";

export const metadata: Metadata = {
  title: "Apply Leave | HR Attendance",
};

export default function EmployeeLeaveApplyPage() {
  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 4px" }}>Apply Leave</h1>
        <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: 0 }}>
          Choose a leave type and date range, add a reason, and submit for approval.
        </p>
      </div>

      <SectionCard title="New leave request">
        <LeaveApplyForm />
      </SectionCard>
    </>
  );
}
