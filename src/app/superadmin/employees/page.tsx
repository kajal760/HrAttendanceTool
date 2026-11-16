import type { Metadata } from "next";
import Link from "next/link";
import { Users, UserCheck, UserX, Building2, Briefcase, UserPlus, Clock, Hourglass, PartyPopper } from "lucide-react";
import { getEmployeeOverviews } from "@/lib/hr/employee-store";
import { getDepartments } from "@/lib/hr/department-store";
import { getOrgRegistry } from "@/lib/hr/org-registry-store";
import { getCelebrations } from "@/lib/hr/celebrations";
import { getSession } from "@/lib/auth/get-session";
import { withBase } from "@/lib/portal";
import StatTile from "@/components/hr/StatTile";
import SectionCard from "@/components/employee/SectionCard";
import EmployeeGrowthChart, { type MonthlyCountPoint } from "@/components/hr/EmployeeGrowthChart";
import AssetStatusDonut from "@/components/hr/assets/AssetStatusDonut";
import lifecycleStyles from "@/components/hr/lifecycle/Lifecycle.module.css";

export const metadata: Metadata = {
  title: "Employee Dashboard | HumSetu",
};

export const dynamic = "force-dynamic";

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Fixed, distinct colors per lifecycle status - same reasoning as the POSH
// dashboard's status tones: a canvas chart needs resolved colors, not
// unresolved `var(--...)` strings, so these are literal hex rather than
// reading the CSS custom properties.
const STATUS_COLOR: Record<string, string> = {
  Active: "#1a8a4a",
  Onboarding: "#8a93a6",
  Probation: "#4a3aa7",
  "On Leave": "#b96b00",
  "Notice Period": "#c62828",
  Resigned: "#9c3b3b",
  Exited: "#6b1f1f",
};

const DEPARTMENT_COLORS = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#4a3aa7", "#e34948"];

function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

function monthKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default async function EmployeeDashboardPage() {
  const [employees, departments, designations, celebrations, session] = await Promise.all([
    getEmployeeOverviews(),
    getDepartments(),
    getOrgRegistry("designations"),
    getCelebrations(60),
    getSession(),
  ]);
  const base = session?.role === "HR" ? "/hr" : "/superadmin";

  const activeDepartments = departments.filter((d) => !d.archived);
  const activeCount = employees.filter((e) => e.status === "Active").length;
  const newJoiners = employees.filter((e) => daysSince(e.joinedOn) <= 30).length;

  const stats = [
    { label: "Total Employees", value: employees.length, icon: Users, tone: "accent" as const },
    { label: "Active", value: activeCount, icon: UserCheck, tone: "success" as const },
    { label: "Inactive", value: employees.length - activeCount, icon: UserX, tone: "danger" as const },
    { label: "Departments", value: activeDepartments.length, icon: Building2, tone: "info" as const },
    { label: "Designations", value: designations.length, icon: Briefcase, tone: "warning" as const },
    { label: "New Joiners", value: newJoiners, icon: UserPlus, tone: "accent" as const },
  ];

  // Employee growth: new joiners per month, last 6 months.
  const now = new Date();
  const growth: MonthlyCountPoint[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    growth.push({ label: MONTH_LABELS[d.getMonth()], value: employees.filter((e) => monthKey(e.joinedOn) === key).length });
  }

  // By department.
  const byDepartment = new Map<string, number>();
  for (const e of employees) byDepartment.set(e.department, (byDepartment.get(e.department) ?? 0) + 1);
  const departmentSlices = Array.from(byDepartment.entries())
    .map(([label, value], i) => ({ label, value, color: DEPARTMENT_COLORS[i % DEPARTMENT_COLORS.length] }))
    .sort((a, b) => b.value - a.value);

  // By lifecycle status.
  const byStatus = new Map<string, number>();
  for (const e of employees) byStatus.set(e.status, (byStatus.get(e.status) ?? 0) + 1);
  const statusSlices = Array.from(byStatus.entries())
    .map(([label, value]) => ({ label, value, color: STATUS_COLOR[label] ?? "#8a93a6" }))
    .sort((a, b) => b.value - a.value);

  // Alerts.
  const probationCompletion = employees.filter((e) => e.confirmationStatus === "Confirmation Due").length;
  const pendingOnboarding = employees.filter(
    (e) => e.status === "Onboarding" && e.onboardingTasks.some((t) => !t.done),
  ).length;
  const upcomingAnniversaries = celebrations.filter((c) => c.kind === "Work Anniversary" && c.daysUntil >= 0 && c.daysUntil <= 30).length;

  const alerts = [
    { label: "Probation completion", count: probationCompletion, icon: Hourglass },
    { label: "Pending onboarding", count: pendingOnboarding, icon: Clock },
    { label: "Upcoming work anniversaries", count: upcomingAnniversaries, icon: PartyPopper },
  ].filter((a) => a.count > 0);

  // Department summary table.
  const departmentRows = activeDepartments
    .map((d) => {
      const members = employees.filter((e) => e.department === d.name);
      return {
        name: d.name,
        total: members.length,
        active: members.filter((e) => e.status === "Active").length,
        newJoiners: members.filter((e) => daysSince(e.joinedOn) <= 30).length,
      };
    })
    .filter((d) => d.total > 0)
    .sort((a, b) => b.total - a.total);

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 4px" }}>Employee Dashboard</h1>
        <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: 0 }}>
          Company-wide workforce overview - strength, growth, and lifecycle.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 14, marginBottom: 18 }}>
        {stats.map((s) => (
          <StatTile key={s.label} label={s.label} value={s.value} icon={s.icon} tone={s.tone} />
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16, marginBottom: 16 }}>
        <SectionCard title="Employee Growth" subtitle="Monthly onboarding trend - last 6 months">
          <EmployeeGrowthChart data={growth} />
        </SectionCard>
        <SectionCard title="Employee Alerts" subtitle="Needs attention">
          {alerts.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--color-text-muted)" }}>Nothing needs attention right now.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {alerts.map((a) => (
                <div key={a.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600 }}>
                    <a.icon size={15} strokeWidth={2.25} style={{ color: "var(--color-hr-accent)" }} />
                    {a.label}
                  </span>
                  <span style={{ fontSize: 13, color: "var(--color-text-muted)" }}>{a.count} employee{a.count === 1 ? "" : "s"}</span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16, marginBottom: 16 }}>
        <SectionCard title="By Department" subtitle="Workforce distribution">
          <AssetStatusDonut data={departmentSlices} />
        </SectionCard>
        <SectionCard title="By Lifecycle" subtitle="Employee status">
          <AssetStatusDonut data={statusSlices} />
        </SectionCard>
      </div>

      <SectionCard
        title="Department Summary"
        subtitle="Department-wise employee count and active workforce"
        action={
          <Link href={withBase(base, "/employees/department")} style={{ fontSize: 12, fontWeight: 600, color: "var(--color-hr-accent)" }}>
            View All →
          </Link>
        }
      >
        <div className={lifecycleStyles.tableWrap}>
          <table className={lifecycleStyles.table}>
            <thead>
              <tr>
                <th>Department</th>
                <th>Total</th>
                <th>Active</th>
                <th>New Joiners</th>
              </tr>
            </thead>
            <tbody>
              {departmentRows.map((d) => (
                <tr key={d.name}>
                  <td style={{ fontWeight: 600 }}>{d.name}</td>
                  <td>{d.total}</td>
                  <td>{d.active}</td>
                  <td>{d.newJoiners}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {departmentRows.length === 0 && <div className={lifecycleStyles.empty}>No departments with employees yet.</div>}
        </div>
      </SectionCard>
    </>
  );
}
