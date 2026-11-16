import type { Metadata } from "next";
import { getTrainingProgrammes } from "@/lib/hr/training-store";
import TrainingProgrammesView from "@/components/hr/training/TrainingProgrammesView";

export const metadata: Metadata = {
  title: "Training Programmes | HumSetu",
};

export const dynamic = "force-dynamic";

export default async function TrainingProgrammesPage() {
  const programmes = await getTrainingProgrammes(true);

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 4px" }}>Training Programmes</h1>
        <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: 0 }}>
          Create and manage the master training catalogue - one programme can be assigned to many employees.
        </p>
      </div>
      <TrainingProgrammesView initialProgrammes={programmes} />
    </>
  );
}
