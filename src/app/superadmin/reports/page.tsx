import type { Metadata } from "next";
import { getDocuments } from "@/lib/superadmin/document-store";
import DocumentManager from "@/components/hr/DocumentManager";
import SectionCard from "@/components/employee/SectionCard";

export const metadata: Metadata = {
  title: "Reports | HR Attendance",
};

// The document store is live, mutable, in-memory state - never prerender a
// stale snapshot of it at build time.
export const dynamic = "force-dynamic";

export default async function SuperAdminReportsPage() {
  const initialDocuments = await getDocuments();

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 4px" }}>Reports</h1>
        <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: 0 }}>
          Upload company PDFs - leave policy, handbook, onboarding guides - for
          employees to view under Policies.
        </p>
      </div>
      <SectionCard title="Company documents" subtitle="Visible to every employee once uploaded">
        <DocumentManager initialDocuments={initialDocuments} />
      </SectionCard>
    </>
  );
}
