import type { Metadata } from "next";
import { getTrainingAssignments } from "@/lib/hr/training-store";
import TrainingProgressView from "@/components/hr/training/TrainingProgressView";

export const metadata: Metadata = {
  title: "Training Progress | HumSetu",
};

export const dynamic = "force-dynamic";

export default async function TrainingProgressPage() {
  const assignments = await getTrainingAssignments();

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 4px" }}>Training Progress</h1>
        <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: 0 }}>
          Completion, attendance, and assessment results across all assigned trainings.
        </p>
      </div>
      <TrainingProgressView initialAssignments={assignments} />
    </>
  );
}
