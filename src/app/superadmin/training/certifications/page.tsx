import type { Metadata } from "next";
import { getTrainingAssignments } from "@/lib/hr/training-store";
import CertificationsView from "@/components/hr/training/CertificationsView";

export const metadata: Metadata = {
  title: "Certifications | HumSetu",
};

export const dynamic = "force-dynamic";

export default async function CertificationsPage() {
  const assignments = await getTrainingAssignments();

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 4px" }}>Certifications</h1>
        <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: 0 }}>
          Certificates issued, their validity, and verification links.
        </p>
      </div>
      <CertificationsView initialAssignments={assignments} />
    </>
  );
}
