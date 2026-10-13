import type { Metadata } from "next";
import Link from "next/link";
import { getUpcomingHolidays } from "@/lib/employee/mock-data";
import { getLeaveRequestsForEmployee } from "@/lib/hr/leave-store";
import { computeBalances } from "@/lib/hr/leave-balance";
import { getSettings } from "@/lib/hr/settings-store";
import { requireCurrentEmployee } from "@/lib/auth/current-employee";
import SectionCard from "@/components/employee/SectionCard";
import LeaveBalanceList from "@/components/employee/LeaveBalanceList";

export const metadata: Metadata = {
  title: "Leave Balance | HR Attendance",
};

export const dynamic = "force-dynamic";

export default async function EmployeeLeaveBalancePage() {
  const employee = await requireCurrentEmployee();
  const [requests, settings, holidays] = await Promise.all([
    getLeaveRequestsForEmployee(employee.id),
    getSettings(),
    getUpcomingHolidays(),
  ]);
  const leave = computeBalances(requests, employee.id, settings.leaveYearStart);

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 4px" }}>Leave Balance</h1>
        <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: 0 }}>
          Allocated, used, and remaining leave by type. Need time off?{" "}
          <Link href="/employee/leave/apply" style={{ color: "var(--color-primary)", fontWeight: 600 }}>
            Apply for leave
          </Link>
          .
        </p>
      </div>

      <div style={{ marginBottom: 16 }}>
        <SectionCard title="Leave balance" subtitle={`${leave.totalAllocated} days/yr allocated`}>
          <LeaveBalanceList items={leave.byType} />
        </SectionCard>
      </div>

      <SectionCard title="Upcoming holidays">
        {holidays.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--color-text-muted)" }}>No holidays coming up.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {holidays.map((h) => (
              <div key={h.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5 }}>
                <span>{h.name}</span>
                <span style={{ color: "var(--color-text-muted)" }}>
                  {new Date(h.date).toLocaleDateString(undefined, { day: "2-digit", month: "short" })}
                </span>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </>
  );
}
