import type { Metadata } from "next";
import type { EmployeeOverview } from "@/types/hr";
import { getEmployeeOverviews } from "@/lib/hr/employee-store";
import { requireCurrentEmployee } from "@/lib/auth/current-employee";
import SectionCard from "@/components/employee/SectionCard";
import ReportingHierarchy from "@/components/employee/ReportingHierarchy";

export const metadata: Metadata = {
  title: "Reporting Hierarchy | HR Attendance",
};

export const dynamic = "force-dynamic";

export default async function EmployeeReportingHierarchyPage() {
  const [me, all] = await Promise.all([requireCurrentEmployee(), getEmployeeOverviews()]);
  const byId = new Map(all.map((e) => [e.id, e]));

  // Walk the manager chain upward, immediate manager first - cycle-safe in
  // case of bad data (a manager loop would otherwise spin forever).
  const chain: EmployeeOverview[] = [];
  const seen = new Set([me.id]);
  let current: EmployeeOverview | undefined = me.managerId ? byId.get(me.managerId) : undefined;
  while (current && !seen.has(current.id)) {
    chain.push(current);
    seen.add(current.id);
    current = current.managerId ? byId.get(current.managerId) : undefined;
  }

  const reports = all.filter((e) => e.managerId === me.id);

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 4px" }}>Reporting Hierarchy</h1>
        <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: 0 }}>
          Your place in the org - who you report to, and who reports to you.
        </p>
      </div>
      <SectionCard title="Your chain">
        <ReportingHierarchy me={me} chain={chain} reports={reports} />
      </SectionCard>
    </>
  );
}
