import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";
import { getRecordHistory } from "@/lib/hr/attendance-store";
import styles from "@/components/hr/lifecycle/Lifecycle.module.css";

export const metadata: Metadata = {
  title: "My Clock History | HR Attendance",
};

export const dynamic = "force-dynamic";

const HISTORY_LIMIT = 30;

function formatDay(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function formatTime(iso?: string): string {
  return iso ? new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "-";
}

function formatWorked(ms: number): string {
  const mins = Math.max(0, Math.floor(ms / 60000));
  return `${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, "0")}m`;
}

// This is the signed-in admin/HR user's own clock-in/out log, moved off the
// dashboard card onto its own page (reachable from the Attendance section's
// horizontal nav) so the dashboard stays focused on today's status.
export default async function MyClockHistoryPage() {
  const session = await getSession();
  if (!session || session.role === "Employee") redirect("/login");

  const records = await getRecordHistory(session.userId, HISTORY_LIMIT);
  const completeDays = records.filter((r) => r.clockIn && r.clockOut);
  const totalWorkedMs = completeDays.reduce(
    (sum, r) => sum + (new Date(r.clockOut!).getTime() - new Date(r.clockIn!).getTime()),
    0,
  );

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 4px" }}>My Clock History</h1>
        <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: 0 }}>
          Your own clock-in/clock-out record for the last {HISTORY_LIMIT} days.
        </p>
      </div>

      <div className={styles.statGrid}>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{records.length}</span>
          <span className={styles.statLabel}>Days recorded</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{completeDays.length}</span>
          <span className={styles.statLabel}>Complete days</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{completeDays.length ? formatWorked(totalWorkedMs / completeDays.length) : "-"}</span>
          <span className={styles.statLabel}>Average worked/day</span>
        </div>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Date</th>
              <th>Clock in</th>
              <th>Clock out</th>
              <th>Worked</th>
            </tr>
          </thead>
          <tbody>
            {records.map((r) => (
              <tr key={r.id}>
                <td>{formatDay(r.date)}</td>
                <td>{formatTime(r.clockIn)}</td>
                <td>{formatTime(r.clockOut)}</td>
                <td>
                  {r.clockIn && r.clockOut
                    ? formatWorked(new Date(r.clockOut).getTime() - new Date(r.clockIn).getTime())
                    : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {records.length === 0 && <div className={styles.empty}>No clock-in history yet.</div>}
      </div>
    </>
  );
}
