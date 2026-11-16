import type { Metadata } from "next";
import { getTrainingAssignments, getTrainingProgrammes } from "@/lib/hr/training-store";
import { getEmployeeOverviews } from "@/lib/hr/employee-store";
import AssignedTrainingsView from "@/components/hr/training/AssignedTrainingsView";

export const metadata: Metadata = {
  title: "Assigned Trainings | HumSetu",
};

export const dynamic = "force-dynamic";

export default async function AssignedTrainingsPage() {
  const [assignments, programmes, employees] = await Promise.all([
    getTrainingAssignments(),
    getTrainingProgrammes(),
    getEmployeeOverviews(),
  ]);
  const people = employees
    .filter((e) => !e.exit?.deletedOn)
    .map((e) => ({ id: e.id, name: e.name, employeeCode: e.employeeCode, department: e.department }));

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 4px" }}>Assigned Trainings</h1>
        <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: 0 }}>
          Employee-wise training assignments, due dates, and priority.
        </p>
      </div>
      <AssignedTrainingsView initialAssignments={assignments} programmes={programmes} people={people} />
    </>
  );
}
