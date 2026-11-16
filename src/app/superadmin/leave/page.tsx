import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, CheckCircle2, Clock, XCircle } from "lucide-react";
import { getLeaveRequests } from "@/lib/hr/leave-store";
import { withBase } from "@/lib/portal";
import { getSession } from "@/lib/auth/get-session";
import type { LeaveRequest, LeaveRequestStatus } from "@/types/employee";
import LeaveByTypeChart from "@/components/hr/leave/LeaveByTypeChart";
import StackedTrendBarChart from "@/components/hr/StackedTrendBarChart";
import type { LeaveTrendPoint } from "@/components/hr/leave/LeaveTrendChart";
import lifecycleStyles from "@/components/hr/lifecycle/Lifecycle.module.css";
import leaveStyles from "@/components/hr/leave/Leave.module.css";
import SectionCard from "@/components/employee/SectionCard";

export const metadata: Metadata = {
  title: "Leave Overview | HumSetu",
};

export const dynamic = "force-dynamic";

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

function delta(current: number, previous: number): string {
  if (previous === 0) return current === 0 ? "No change" : "New this month";
  const pct = Math.round(((current - previous) / previous) * 100);
  return `${pct >= 0 ? "+" : ""}${pct}% vs last month`;
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

const BADGE_CLASS: Record<LeaveRequestStatus, string> = {
  Pending: "badge-pending",
  Approved: "badge-approved",
  Rejected: "badge-rejected",
  Cancelled: "badge-cancelled",
};

export default async function LeaveOverviewPage() {
  const [requests, session] = await Promise.all([getLeaveRequests(), getSession()]);
  const base = session?.role === "HR" ? "/hr" : "/superadmin";

  const now = new Date();
  const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;

  const thisMonth = requests.filter((r) => monthKey(r.submittedAt) === thisMonthKey);
  const prevMonth = requests.filter((r) => monthKey(r.submittedAt) === prevMonthKey);

  const countBy = (list: LeaveRequest[], status: LeaveRequestStatus) => list.filter((r) => r.status === status).length;

  const stats = [
    {
      label: "Total Leaves",
      value: thisMonth.length,
      delta: delta(thisMonth.length, prevMonth.length),
      icon: CalendarDays,
      tone: "info" as const,
    },
    {
      label: "Approved",
      value: countBy(thisMonth, "Approved"),
      delta: delta(countBy(thisMonth, "Approved"), countBy(prevMonth, "Approved")),
      icon: CheckCircle2,
      tone: "success" as const,
    },
    {
      label: "Pending",
      value: countBy(thisMonth, "Pending"),
      delta: delta(countBy(thisMonth, "Pending"), countBy(prevMonth, "Pending")),
      icon: Clock,
      tone: "warning" as const,
    },
    {
      label: "Rejected",
      value: countBy(thisMonth, "Rejected"),
      delta: delta(countBy(thisMonth, "Rejected"), countBy(prevMonth, "Rejected")),
      icon: XCircle,
      tone: "danger" as const,
    },
  ];

  // Leave by type - days actually taken (Approved) this month.
  const byType = new Map<string, number>();
  for (const r of thisMonth) {
    if (r.status !== "Approved") continue;
    byType.set(r.category, (byType.get(r.category) ?? 0) + r.days);
  }
  const typeSlices = Array.from(byType.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
  const totalTypeDays = typeSlices.reduce((sum, s) => sum + s.value, 0);

  // 6-month trend: requests applied vs approved, bucketed by month.
  const trend: LeaveTrendPoint[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const applied = requests.filter((r) => monthKey(r.submittedAt) === key).length;
    const approved = requests.filter((r) => r.status === "Approved" && r.decidedAt && monthKey(r.decidedAt) === key).length;
    trend.push({ label: MONTH_LABELS[d.getMonth()], applied, approved });
  }

  const recent = [...requests].sort((a, b) => (a.submittedAt < b.submittedAt ? 1 : -1)).slice(0, 5);

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 4px" }}>Leave Overview</h1>
        <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: 0 }}>
          Track leave activity and pending approvals.
        </p>
      </div>

      <div className={lifecycleStyles.statGrid}>
        {stats.map((s) => (
          <div key={s.label} className={lifecycleStyles.statCard}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <s.icon size={16} strokeWidth={2.25} style={{ color: `var(--color-${s.tone})` }} />
              <span className={lifecycleStyles.statLabel}>{s.label}</span>
            </div>
            <span className={lifecycleStyles.statValue}>{s.value}</span>
            <span style={{ fontSize: 11, color: "var(--color-text-muted)" }}>{s.delta}</span>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16, marginBottom: 18 }}>
        <SectionCard title="Leave by Type" subtitle="Approved days, this month">
          <LeaveByTypeChart data={typeSlices} totalLabel={String(totalTypeDays)} />
        </SectionCard>
        <SectionCard title="Leave Trend" subtitle="Applied vs approved, last 6 months">
          <StackedTrendBarChart
            data={trend.map((t) => ({ label: t.label, a: t.applied, b: t.approved }))}
            aLabel="Applied"
            bLabel="Approved"
          />
        </SectionCard>
      </div>

      <SectionCard
        title="Recent Leave Requests"
        action={
          <Link href={withBase(base, "/leave/requests")} style={{ fontSize: 12, fontWeight: 600, color: "var(--color-hr-accent)" }}>
            View All →
          </Link>
        }
      >
        <div className={lifecycleStyles.tableWrap}>
          <table className={lifecycleStyles.table}>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Leave Type</th>
                <th>Period</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((r) => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 600 }}>{r.employeeName}</td>
                  <td>{r.category}</td>
                  <td className={lifecycleStyles.muted}>
                    {formatDate(r.startDate)}
                    {r.endDate !== r.startDate ? ` – ${formatDate(r.endDate)}` : ""}
                  </td>
                  <td>
                    <span className={`${leaveStyles.badge} ${leaveStyles[BADGE_CLASS[r.status]]}`}>{r.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {recent.length === 0 && <div className={lifecycleStyles.empty}>No leave requests yet.</div>}
        </div>
      </SectionCard>
    </>
  );
}
