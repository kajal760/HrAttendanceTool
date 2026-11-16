import type { Metadata } from "next";
import Link from "next/link";
import { AlarmClock, LogOut, ClipboardList } from "lucide-react";
import { getRangeRecords, resolvePeriod, todayIso, type DailyRecord } from "@/lib/hr/attendance-daily";
import { getCorrections } from "@/lib/hr/attendance-corrections";
import { getSession } from "@/lib/auth/get-session";
import { withBase } from "@/lib/portal";
import PeriodFilter from "@/components/hr/attendance/PeriodFilter";
import AttendanceTable from "@/components/hr/attendance/AttendanceTable";
import PeriodSummary from "@/components/hr/attendance/PeriodSummary";
import StatCard from "@/components/hr/StatCard";
import SectionCard from "@/components/employee/SectionCard";
import AttendanceTrendChart, { type AttendanceTrendPoint } from "@/components/hr/attendance/AttendanceTrendChart";
import styles from "@/components/hr/lifecycle/Lifecycle.module.css";

export const metadata: Metadata = {
  title: "Attendance | HumSetu",
};

export const dynamic = "force-dynamic";

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

type SearchParams = { period?: string; date?: string; from?: string; to?: string };

function isPresent(r: DailyRecord): boolean {
  return r.status === "Present" || r.status === "Late" || r.status === "Half Day";
}

export default async function AttendanceOverviewPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const period = resolvePeriod(await searchParams);
  const records = await getRangeRecords(period.from, period.to);
  const label = period.mode === "day" ? period.from : `${period.from} to ${period.to}`;

  const count = (pred: (r: (typeof records)[number]) => boolean) => records.filter(pred).length;
  const cards = [
    { label: "Total Employees", value: period.mode === "day" ? records.length : new Set(records.map((r) => r.employeeId)).size },
    { label: "Present", value: count((r) => r.status === "Present") },
    { label: "WFH", value: count((r) => r.workMode === "WFH" && r.status !== "Absent" && r.status !== "On Leave") },
    { label: "On Leave", value: count((r) => r.status === "On Leave") },
    { label: "Late Check-ins", value: count((r) => r.status === "Late") },
    { label: "Absent", value: count((r) => r.status === "Absent") },
  ];

  if (period.mode === "day") {
    const session = await getSession();
    const base = session?.role === "HR" ? "/hr" : "/superadmin";

    // Monthly Attendance Trend - last 6 months, independent of the selected
    // day, same "fixed trailing window" convention Leave Overview and
    // Company Updates use for their own trend charts.
    const now = new Date();
    const trendFrom = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const trendTo = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const toIso = (d: Date) => d.toISOString().slice(0, 10);
    const [trendRecords, corrections] = await Promise.all([
      getRangeRecords(toIso(trendFrom), toIso(trendTo)),
      getCorrections(),
    ]);

    const monthKey = (iso: string) => iso.slice(0, 7);
    const trend: AttendanceTrendPoint[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const monthRecords = trendRecords.filter((r) => monthKey(r.date) === key);
      trend.push({
        label: MONTH_LABELS[d.getMonth()],
        present: monthRecords.filter(isPresent).length,
        absent: monthRecords.filter((r) => r.status === "Absent").length,
        wfh: monthRecords.filter((r) => r.workMode === "WFH").length,
      });
    }

    // A checkout only counts as "missing" once the day itself is over -
    // today's still-open clock-ins just haven't left yet.
    const today = todayIso();
    const missingClockOuts = records.filter((r) => r.date < today && r.checkIn !== null && r.checkOut === null).length;
    const pendingCorrections = corrections.filter((c) => c.status === "Pending").length;

    const byDepartment = new Map<string, { total: number; present: number; wfh: number; absent: number }>();
    for (const r of records) {
      const entry = byDepartment.get(r.department) ?? { total: 0, present: 0, wfh: 0, absent: 0 };
      entry.total += 1;
      if (isPresent(r)) entry.present += 1;
      if (r.workMode === "WFH") entry.wfh += 1;
      if (r.status === "Absent") entry.absent += 1;
      byDepartment.set(r.department, entry);
    }
    const departmentRows = Array.from(byDepartment.entries())
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.total - a.total);

    const exceptions = [
      { label: "Late check-ins", count: cards[4].value, icon: AlarmClock, href: null },
      { label: "Missing clock-outs", count: missingClockOuts, icon: LogOut, href: null },
      {
        label: "Pending corrections",
        count: pendingCorrections,
        icon: ClipboardList,
        href: withBase(base, "/attendance/corrections"),
      },
    ];

    return (
      <>
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 4px" }}>Attendance</h1>
          <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: 0 }}>
            Company-wide attendance monitoring.
          </p>
        </div>

        <PeriodFilter period={period.mode} anchor={period.anchor} from={period.from} to={period.to} />

        <div className={styles.statGrid}>
          {cards.map((c) => (
            <StatCard key={c.label} label={c.label} value={c.value} />
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16, marginBottom: 16 }}>
          <SectionCard title="Monthly Attendance Trend" subtitle="Present, absent and WFH - last 6 months">
            <AttendanceTrendChart data={trend} />
          </SectionCard>
          <SectionCard title="Attendance Exceptions" subtitle="Needs attention">
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {exceptions.map((e) => {
                const row = (
                  <div key={e.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600 }}>
                      <e.icon size={15} strokeWidth={2.25} style={{ color: "var(--color-hr-accent)" }} />
                      {e.label}
                    </span>
                    <span style={{ fontSize: 13, color: "var(--color-text-muted)" }}>{e.count}</span>
                  </div>
                );
                return e.href && e.count > 0 ? (
                  <Link key={e.label} href={e.href} style={{ textDecoration: "none", color: "inherit" }}>
                    {row}
                  </Link>
                ) : (
                  row
                );
              })}
            </div>
          </SectionCard>
        </div>

        <SectionCard title="Department-wise Attendance" subtitle={`Totals for ${label}`}>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Department</th>
                  <th>Total</th>
                  <th>Present</th>
                  <th>WFH</th>
                  <th>Absent</th>
                </tr>
              </thead>
              <tbody>
                {departmentRows.map((d) => (
                  <tr key={d.name}>
                    <td style={{ fontWeight: 600 }}>{d.name || "—"}</td>
                    <td>{d.total}</td>
                    <td>{d.present}</td>
                    <td>{d.wfh}</td>
                    <td>{d.absent}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {departmentRows.length === 0 && <div className={styles.empty}>No attendance recorded for this day.</div>}
          </div>
        </SectionCard>

        <div style={{ marginTop: 16 }}>
          {records.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--color-text-muted)" }}>No attendance is recorded on weekends.</p>
          ) : (
            <AttendanceTable records={records} variant="overview" />
          )}
        </div>
      </>
    );
  }

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 4px" }}>Attendance</h1>
        <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: 0 }}>
          Company-wide attendance for the selected period.
        </p>
      </div>

      <PeriodFilter period={period.mode} anchor={period.anchor} from={period.from} to={period.to} />

      {records.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--color-text-muted)" }}>No working days in this period.</p>
      ) : (
        <PeriodSummary records={records} periodLabel={label} />
      )}
    </>
  );
}
