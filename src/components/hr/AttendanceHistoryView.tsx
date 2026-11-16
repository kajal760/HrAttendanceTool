import type { AttendanceHistoryDayStatus, AttendanceHistory, LeaveStatus } from "@/types/attendance";
import { formatDay } from "@/lib/hr/attendance-format";
import styles from "./AttendanceHistoryView.module.css";

const LEAVE_TONE: Record<LeaveStatus, string> = {
  Pending: "amber",
  Approved: "green",
  Rejected: "red",
  Cancelled: "gray",
};

const DAY_TONE: Record<AttendanceHistoryDayStatus, string> = {
  Present: "green",
  WFH: "blue",
  Late: "amber",
  "Half Day": "amber",
  Absent: "red",
  "On Leave": "gray",
  Holiday: "blue",
};

export default function AttendanceHistoryView({ data }: { data: AttendanceHistory }) {
  const s = data.summary;
  const cards: { label: string; value: number; sub?: string }[] = [
    { label: "Present", value: s.present },
    { label: "Late", value: s.late },
    { label: "WFH", value: s.wfh },
    { label: "Absent", value: s.absent },
    { label: "Leave taken", value: s.leaveTaken, sub: "approved days" },
    { label: "Leave pending", value: s.leavePending, sub: `${s.leavePendingDays} day${s.leavePendingDays === 1 ? "" : "s"}` },
    { label: "Leave rejected", value: s.leaveRejected, sub: "requests" },
  ];

  return (
    <div className={styles.wrap}>
      <p className={styles.note}>
        Last 30 working days and leave requests. Leave requests and On Leave/Holiday days are real; other daily
        statuses are simulated until a real clock-in/out feed exists.
      </p>

      <div className={styles.cards}>
        {cards.map((c) => (
          <div key={c.label} className={styles.card}>
            <span className={styles.cardValue}>{c.value}</span>
            <span className={styles.cardLabel}>{c.label}</span>
            {c.sub && <span className={styles.cardSub}>{c.sub}</span>}
          </div>
        ))}
      </div>

      <h3 className={styles.heading}>Leave requests</h3>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Type</th>
              <th>From</th>
              <th>To</th>
              <th>Days</th>
              <th>Applied</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {data.leaves.map((l) => (
              <tr key={l.id}>
                <td>{l.category}</td>
                <td>{formatDay(l.from)}</td>
                <td>{formatDay(l.to)}</td>
                <td>{l.days}</td>
                <td className={styles.muted}>{formatDay(l.appliedOn)}</td>
                <td>
                  <span className={`${styles.badge} ${styles[LEAVE_TONE[l.status]]}`}>{l.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {data.leaves.length === 0 && <div className={styles.empty}>No leave requests.</div>}
      </div>

      <h3 className={styles.heading}>Daily attendance</h3>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {data.days.map((d) => (
              <tr key={d.date}>
                <td>{formatDay(d.date)}</td>
                <td>
                  <span className={`${styles.badge} ${styles[DAY_TONE[d.status]]}`}>{d.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
