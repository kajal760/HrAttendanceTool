import type { Metadata } from "next";
import { getAllLeaveTotals } from "@/lib/hr/leave-store";
import { getEmployeeOverviews } from "@/lib/hr/employee-store";
import LeaveBalanceTable from "@/components/hr/leave/LeaveBalanceTable";
import StatCard from "@/components/hr/StatCard";
import styles from "@/components/hr/lifecycle/Lifecycle.module.css";

export const metadata: Metadata = {
  title: "Leave Balance | HumSetu",
};

export const dynamic = "force-dynamic";

export default async function SuperAdminLeaveBalancePage() {
  const [totals, employees] = await Promise.all([getAllLeaveTotals(), getEmployeeOverviews()]);

  const totalAllocated = totals.reduce((sum, t) => sum + t.totalAllocated, 0);
  const totalUsed = totals.reduce((sum, t) => sum + t.totalUsed, 0);
  const totalRemaining = totals.reduce((sum, t) => sum + t.totalRemaining, 0);
  const avgPercentUsed = totalAllocated > 0 ? Math.round((totalUsed / totalAllocated) * 100) : 0;

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 4px" }}>Leave Balance</h1>
        <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: 0 }}>
          Allocated, used, and remaining leave across the company for the current calendar year.
        </p>
      </div>
      <div className={styles.statGrid}>
        <StatCard label="Allocated (company-wide)" value={`${totalAllocated} days`} />
        <StatCard label="Used (company-wide)" value={`${totalUsed} days`} />
        <StatCard label="Remaining (company-wide)" value={`${totalRemaining} days`} />
        <StatCard label="Average used" value={`${avgPercentUsed}%`} />
      </div>
      <LeaveBalanceTable totals={totals} employees={employees} />
    </>
  );
}
