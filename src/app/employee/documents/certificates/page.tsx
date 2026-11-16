import type { Metadata } from "next";
import { getEmployeeDocuments } from "@/lib/superadmin/document-store";
import { requireCurrentEmployee } from "@/lib/auth/current-employee";
import SectionCard from "@/components/employee/SectionCard";
import CertificateManager from "@/components/employee/CertificateManager";

export const metadata: Metadata = {
  title: "Certificates | HumSetu",
};

export const dynamic = "force-dynamic";

export default async function EmployeeCertificatesPage() {
  const employee = await requireCurrentEmployee();
  const documents = await getEmployeeDocuments(employee.id);
  const certificates = documents.filter((d) => d.category === "Certificate");

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 4px" }}>Certificates</h1>
        <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: 0 }}>
          Upload and download your own certificates - degree, training, or course completion.
        </p>
      </div>
      <SectionCard title="Your certificates">
        <CertificateManager initialCertificates={certificates} />
      </SectionCard>
    </>
  );
}
