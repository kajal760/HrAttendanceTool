import type { Metadata } from "next";
import { loadProfileContext } from "@/lib/employee/profile-context";
import ProfileHeader from "@/components/employee/profile/ProfileHeader";
import PersonalDetails from "@/components/employee/profile/PersonalDetails";
import SectionCard from "@/components/employee/SectionCard";

export const metadata: Metadata = {
  title: "My Profile | HR Attendance",
};

export const dynamic = "force-dynamic";

// Reads the same Employee Master record the Super Admin side manages
// (`@/lib/hr/employee-store`) - one source of truth for both views, same as
// the shared company documents. The signed-in employee comes from the
// session (`requireCurrentEmployee`), not a hardcoded mock profile.
export default async function EmployeeProfilePage() {
  const { employee, managerName } = await loadProfileContext();

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 4px" }}>My Profile</h1>
        <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: 0 }}>Your name and personal details.</p>
      </div>

      <div style={{ marginBottom: 16 }}>
        <ProfileHeader employee={employee} managerName={managerName} />
      </div>

      <SectionCard title="Personal details">
        <PersonalDetails employee={employee} />
      </SectionCard>
    </>
  );
}
