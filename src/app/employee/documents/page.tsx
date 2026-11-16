import type { Metadata } from "next";
import { getDocuments } from "@/lib/superadmin/document-store";
import SectionCard from "@/components/employee/SectionCard";
import DocumentList from "@/components/employee/DocumentList";

export const metadata: Metadata = {
  title: "HR Policies | HumSetu",
};

// The document store is live, mutable, in-memory state - never prerender a
// stale snapshot of it at build time.
export const dynamic = "force-dynamic";

export default async function EmployeeDocumentsPage() {
  const documents = await getDocuments();
  const policies = documents.filter((d) => d.category !== "SOP");

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 4px" }}>HR Policies</h1>
        <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: 0 }}>
          Leave policy, handbook, and other HR documents published by HR.
        </p>
      </div>
      <SectionCard title="HR documents">
        <DocumentList documents={policies} />
      </SectionCard>
    </>
  );
}
