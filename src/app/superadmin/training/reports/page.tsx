import type { Metadata } from "next";
import { getTrainingAssignments, getTrainingDashboard } from "@/lib/hr/training-store";
import TrainingReportsView from "@/components/hr/training/TrainingReportsView";

export const metadata: Metadata = {
  title: "Training Reports | HumSetu",
};

export const dynamic = "force-dynamic";

export default async function TrainingReportsPage() {
  const [dashboard, assignments] = await Promise.all([getTrainingDashboard(), getTrainingAssignments()]);

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 4px" }}>Training Reports</h1>
        <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: 0 }}>
          Department-wise and employee-wise training completion.
        </p>
      </div>
      <TrainingReportsView dashboard={dashboard} assignments={assignments} />
    </>
  );
}
