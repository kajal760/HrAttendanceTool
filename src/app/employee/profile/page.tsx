import type { Metadata } from "next";
import { loadProfileContext } from "@/lib/employee/profile-context";
import ProfileHeader from "@/components/employee/profile/ProfileHeader";
import PersonalDetails from "@/components/employee/profile/PersonalDetails";
import ContactDetails from "@/components/employee/profile/ContactDetails";
import WorkDetails from "@/components/employee/profile/WorkDetails";
import SectionCard from "@/components/employee/SectionCard";

export const metadata: Metadata = {
  title: "My Profile | HumSetu",
};

export const dynamic = "force-dynamic";

// One landing page for the whole profile - personal details, contact &
// emergency contact (the only part an employee can edit themselves), and
// the HR/Manager-owned work details - instead of three tab-separated pages.
// Reads the same Employee Master record the Super Admin side manages
// (`@/lib/hr/employee-store`) - one source of truth for both views. The
// signed-in employee comes from the session (`requireCurrentEmployee`), not
// a hardcoded mock profile.
export default async function EmployeeProfilePage() {
  const { employee, managerName } = await loadProfileContext();

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 4px" }}>My Profile</h1>
        <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: 0 }}>
          Your personal details, contact info, and work details - all in one place.
        </p>
      </div>

      <div style={{ marginBottom: 16 }}>
        <ProfileHeader employee={employee} managerName={managerName} />
      </div>

      <div style={{ marginBottom: 16 }}>
        <SectionCard title="Personal details">
          <PersonalDetails employee={employee} />
        </SectionCard>
      </div>

      <div style={{ marginBottom: 16 }}>
        <SectionCard title="Contact & emergency contact">
          <ContactDetails employee={employee} />
        </SectionCard>
      </div>

      <WorkDetails employee={employee} managerName={managerName} />
    </>
  );
}
