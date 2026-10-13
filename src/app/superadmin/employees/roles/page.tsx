import type { Metadata } from "next";
import { FEATURES, ROLES, getRolesMatrix } from "@/lib/hr/roles-store";
import RolesMatrix from "@/components/hr/RolesMatrix";

export const metadata: Metadata = {
  title: "Roles & Permissions | HR Attendance",
};

export const dynamic = "force-dynamic";

export default async function RolesPage() {
  const matrix = await getRolesMatrix();

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 4px" }}>Roles &amp; Permissions</h1>
        <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: 0 }}>
          Decide what HR, Admin, Manager, and Employee can access.
        </p>
      </div>
      <RolesMatrix roles={ROLES} features={FEATURES} initialMatrix={matrix} />
    </>
  );
}
