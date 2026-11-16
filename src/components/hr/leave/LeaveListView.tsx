import type { LeaveRequest, LeaveRequestStatus } from "@/types/employee";
import styles from "./Leave.module.css";

const BADGE_CLASS: Record<LeaveRequestStatus, string> = {
  Pending: "badge-pending",
  Approved: "badge-approved",
  Rejected: "badge-rejected",
  Cancelled: "badge-cancelled",
};

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

interface LeaveListViewProps {
  requests: LeaveRequest[];
}

// Flat chronological list of everyone's Approved/Pending leave, soonest
// first - an alternative to the month grid for scanning who's out when.
export default function LeaveListView({ requests }: LeaveListViewProps) {
  const relevant = [...requests]
    .filter((r) => r.status === "Approved" || r.status === "Pending")
    .sort((a, b) => (a.startDate < b.startDate ? -1 : 1));

  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Employee</th>
            <th>Leave Type</th>
            <th>Dates</th>
            <th>Days</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {relevant.map((r) => (
            <tr key={r.id}>
              <td className={styles.strong}>{r.employeeName}</td>
              <td>{r.category}</td>
              <td className={styles.muted}>
                {formatDate(r.startDate)}
                {r.endDate !== r.startDate ? ` – ${formatDate(r.endDate)}` : ""}
              </td>
              <td>{r.days}</td>
              <td>
                <span className={`${styles.badge} ${styles[BADGE_CLASS[r.status]]}`}>{r.status}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {relevant.length === 0 && <div className={styles.empty}>No upcoming or ongoing leave.</div>}
    </div>
  );
}
