import type { Metadata } from "next";
import { getCorrectionsForEmployee } from "@/lib/hr/attendance-corrections";
import { requireCurrentEmployee } from "@/lib/auth/current-employee";
import SectionCard from "@/components/employee/SectionCard";
import CorrectionRequestPanel from "@/components/employee/CorrectionRequestPanel";

export const metadata: Metadata = {
  title: "Correction Requests | HumSetu",
};

export const dynamic = "force-dynamic";

export default async function EmployeeAttendanceCorrectionsPage() {
  const employee = await requireCurrentEmployee();
  const corrections = await getCorrectionsForEmployee(employee.id);

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 4px" }}>Correction Requests</h1>
        <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: 0 }}>
          Submit a justification for a missed or incorrect clock-in/out for HR to review.
        </p>
      </div>

      <SectionCard
        title="Correction requests"
        subtitle="Submit a justification for HR to review and approve"
      >
        <CorrectionRequestPanel initialRequests={corrections} />
      </SectionCard>
    </>
  );
}
