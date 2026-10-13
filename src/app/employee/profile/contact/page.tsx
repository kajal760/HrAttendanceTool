import type { Metadata } from "next";
import { loadProfileContext } from "@/lib/employee/profile-context";
import ProfileHeader from "@/components/employee/profile/ProfileHeader";
import ContactDetails from "@/components/employee/profile/ContactDetails";
import SectionCard from "@/components/employee/SectionCard";

export const metadata: Metadata = {
  title: "Contact | HR Attendance",
};

export const dynamic = "force-dynamic";

export default async function EmployeeProfileContactPage() {
  const { employee, managerName } = await loadProfileContext();

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 4px" }}>Contact</h1>
        <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: 0 }}>
          Your contact details and emergency contact - the only part of your profile you can edit
          yourself.
        </p>
      </div>

      <div style={{ marginBottom: 16 }}>
        <ProfileHeader employee={employee} managerName={managerName} />
      </div>

      <SectionCard title="Contact & emergency contact">
        <ContactDetails employee={employee} />
      </SectionCard>
    </>
  );
}
