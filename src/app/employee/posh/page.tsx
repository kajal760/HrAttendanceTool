import type { Metadata } from "next";
import { getPoshComplaintsForEmployee } from "@/lib/hr/posh-store";
import { requireCurrentEmployee } from "@/lib/auth/current-employee";
import SectionCard from "@/components/employee/SectionCard";
import PoshComplaintForm from "@/components/employee/PoshComplaintForm";

export const metadata: Metadata = {
  title: "POSH | HumSetu",
};

export const dynamic = "force-dynamic";

export default async function EmployeePoshPage() {
  const employee = await requireCurrentEmployee();
  const complaints = await getPoshComplaintsForEmployee(employee.id);

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 4px" }}>POSH</h1>
        <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: 0 }}>
          Report a Prevention of Sexual Harassment concern, confidentially or anonymously.
        </p>
      </div>
      <SectionCard title="File a complaint">
        <PoshComplaintForm initialComplaints={complaints} />
      </SectionCard>
    </>
  );
}
