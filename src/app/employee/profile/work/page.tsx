import type { Metadata } from "next";
import { loadProfileContext } from "@/lib/employee/profile-context";
import ProfileHeader from "@/components/employee/profile/ProfileHeader";
import WorkDetails from "@/components/employee/profile/WorkDetails";

export const metadata: Metadata = {
  title: "Work Details | HR Attendance",
};

export const dynamic = "force-dynamic";

export default async function EmployeeProfileWorkPage() {
  const { employee, managerName } = await loadProfileContext();

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 4px" }}>Work Details</h1>
        <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: 0 }}>
          Department, designation, manager, skills, education, and experience - set by HR/your
          manager.
        </p>
      </div>

      <div style={{ marginBottom: 16 }}>
        <ProfileHeader employee={employee} managerName={managerName} />
      </div>

      <WorkDetails employee={employee} managerName={managerName} />
    </>
  );
}
