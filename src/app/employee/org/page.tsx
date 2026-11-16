import type { Metadata } from "next";
import { getOrgChartData } from "@/lib/hr/dashboard-data";
import type { OrgChartData } from "@/types/hr";
import OrgChart from "@/components/hr/OrgChart";

export const metadata: Metadata = {
  title: "Org Structure | HumSetu",
};

export const dynamic = "force-dynamic";

// View-only mirror of the Admin/HR Org Structure page, but just the tree -
// the Departments/Designations/Locations registry lists are an editing
// surface for HR, not something Employees need to see.
export default async function EmployeeOrgStructurePage() {
  // `getOrgChartData` reads the Admin/HR-only employee directory under the
  // hood - same reasoning as the other employee-portal pages' `.catch`
  // guards: an Employee-role session gets a 401 there by design, so this
  // degrades to an empty chart instead of crashing the page. Left
  // unguarded for the Admin/HR caller (`superadmin/employees/org/page.tsx`),
  // where a real failure should still surface.
  const data = await getOrgChartData().catch((): OrgChartData => ({ departments: [] }));

  return (
    <>
      <div style={{ marginBottom: 20, textAlign: "center" }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 4px" }}>
          Org Structure
        </h1>
        <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: 0 }}>
          Scroll down to reveal each department in the chart.
        </p>
      </div>

      <OrgChart data={data} />
    </>
  );
}
