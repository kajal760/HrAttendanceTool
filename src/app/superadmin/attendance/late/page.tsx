import type { Metadata } from "next";
import { getDailyRecords, resolveDate } from "@/lib/hr/attendance-daily";
import AttendanceDateFilter from "@/components/hr/attendance/AttendanceDateFilter";
import styles from "@/components/hr/lifecycle/Lifecycle.module.css";

export const metadata: Metadata = {
  title: "Late Check-ins | HR Attendance",
};

export const dynamic = "force-dynamic";

export default async function LateCheckinsPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const { date: rawDate } = await searchParams;
  const date = resolveDate(rawDate);
  const late = (await getDailyRecords(date)).filter((r) => r.status === "Late");

  // Late arrivals per department, for the simple summary bars below.
  const byDept = new Map<string, number>();
  for (const r of late) byDept.set(r.department, (byDept.get(r.department) ?? 0) + 1);
  const deptRows = Array.from(byDept.entries()).sort((a, b) => b[1] - a[1]);
  const maxCount = Math.max(1, ...deptRows.map(([, n]) => n));

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 4px" }}>Late Check-ins</h1>
        <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: 0 }}>
          Anyone who checked in after the expected time for the selected day.
        </p>
      </div>

      <div style={{ marginBottom: 14 }}>
        <AttendanceDateFilter value={date} />
      </div>

      <div className={styles.statGrid}>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{late.length}</span>
          <span className={styles.statLabel}>Late check-ins</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>
            {late.length ? Math.round(late.reduce((s, r) => s + r.delayMin, 0) / late.length) : 0} min
          </span>
          <span className={styles.statLabel}>Average delay</span>
        </div>
      </div>

      {deptRows.length > 0 && (
        <div className={styles.tableWrap} style={{ padding: 16, marginBottom: 16 }}>
          <p className={styles.checklistGroupTitle} style={{ marginBottom: 10 }}>Late check-ins by department</p>
          {deptRows.map(([dept, n]) => (
            <div key={dept} style={{ display: "grid", gridTemplateColumns: "160px 1fr 40px", alignItems: "center", gap: 10, marginBottom: 8, fontSize: 13 }}>
              <span>{dept}</span>
              <div className={styles.progressTrack}>
                <div className={styles.progressFill} style={{ width: `${Math.round((n / maxCount) * 100)}%`, background: "var(--color-warning)" }} />
              </div>
              <span style={{ fontWeight: 600, textAlign: "right" }}>{n}</span>
            </div>
          ))}
        </div>
      )}

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Employee</th>
              <th>Department</th>
              <th>Date</th>
              <th>Expected check-in</th>
              <th>Actual check-in</th>
              <th>Delay</th>
              <th>Work mode</th>
            </tr>
          </thead>
          <tbody>
            {late.map((r) => (
              <tr key={r.employeeId}>
                <td style={{ fontWeight: 600 }}>{r.name}</td>
                <td>{r.department}</td>
                <td>{date}</td>
                <td>{r.expectedCheckIn}</td>
                <td>{r.checkIn}</td>
                <td style={{ color: "var(--color-warning)", fontWeight: 600 }}>{r.delayMin} min</td>
                <td>{r.workMode}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {late.length === 0 && <div className={styles.empty}>No late check-ins on this day.</div>}
      </div>
    </>
  );
}
