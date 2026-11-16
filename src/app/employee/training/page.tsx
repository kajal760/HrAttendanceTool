import type { Metadata } from "next";
import { getMyTrainingAssignments } from "@/lib/hr/training-store";
import { requireCurrentEmployee } from "@/lib/auth/current-employee";
import MyTrainingView from "@/components/employee/training/MyTrainingView";

export const metadata: Metadata = {
  title: "Training | HumSetu",
};

export const dynamic = "force-dynamic";

export default async function EmployeeTrainingPage() {
  await requireCurrentEmployee();
  const assignments = await getMyTrainingAssignments();

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 4px" }}>My Training</h1>
        <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: 0 }}>
          Trainings assigned to you, your progress, and certificates earned.
        </p>
      </div>
      <MyTrainingView initialAssignments={assignments} />
    </>
  );
}
