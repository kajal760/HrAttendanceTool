import type { Metadata } from "next";
import { getRangeRecords, resolvePeriod } from "@/lib/hr/attendance-daily";
import PeriodFilter from "@/components/hr/attendance/PeriodFilter";
import AttendanceTable from "@/components/hr/attendance/AttendanceTable";
import PeriodSummary from "@/components/hr/attendance/PeriodSummary";
import styles from "@/components/hr/lifecycle/Lifecycle.module.css";

export const metadata: Metadata = {
  title: "Attendance | HR Attendance",
};

export const dynamic = "force-dynamic";

type SearchParams = { period?: string; date?: string; from?: string; to?: string };

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

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 4px" }}>Attendance</h1>
        <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: 0 }}>
          Company-wide attendance for the selected period.
        </p>
      </div>

      <PeriodFilter period={period.mode} anchor={period.anchor} from={period.from} to={period.to} />

      {period.mode === "day" ? (
        <>
          <div className={styles.statGrid}>
            {cards.map((c) => (
              <div key={c.label} className={styles.statCard}>
                <span className={styles.statValue}>{c.value}</span>
                <span className={styles.statLabel}>{c.label}</span>
              </div>
            ))}
          </div>
          {records.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--color-text-muted)" }}>No attendance is recorded on weekends.</p>
          ) : (
            <AttendanceTable records={records} variant="overview" />
          )}
        </>
      ) : records.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--color-text-muted)" }}>No working days in this period.</p>
      ) : (
        <PeriodSummary records={records} periodLabel={label} />
      )}
    </>
  );
}
