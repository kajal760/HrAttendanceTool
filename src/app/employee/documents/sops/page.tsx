import type { Metadata } from "next";
import { getDocuments } from "@/lib/superadmin/document-store";
import SectionCard from "@/components/employee/SectionCard";
import DocumentList from "@/components/employee/DocumentList";

export const metadata: Metadata = {
  title: "SOPs | HR Attendance",
};

export const dynamic = "force-dynamic";

export default async function EmployeeSopsPage() {
  const documents = await getDocuments();
  const sops = documents.filter((d) => d.category === "SOP");

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 4px" }}>SOPs</h1>
        <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: 0 }}>
          Standard operating procedures published by HR.
        </p>
      </div>
      <SectionCard title="SOPs">
        <DocumentList documents={sops} emptyMessage="No SOPs published yet." />
      </SectionCard>
    </>
  );
}
