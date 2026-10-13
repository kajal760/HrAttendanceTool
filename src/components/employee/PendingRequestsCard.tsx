import Link from "next/link";
import { CalendarCheck, CalendarDays, Package, ListTodo } from "lucide-react";
import styles from "./PendingRequestsCard.module.css";

interface PendingRequestsCardProps {
  attendanceCorrections: number;
  pendingLeave: number;
  pendingAssetRequests: number;
  overdueTasks: number;
}

// Mirrors the reference dashboard's segmented "pending requests" card, but
// each tile is backed by real counts from this app's own modules rather
// than the reference's exact categories (there's no "Tour" concept here).
export default function PendingRequestsCard({
  attendanceCorrections,
  pendingLeave,
  pendingAssetRequests,
  overdueTasks,
}: PendingRequestsCardProps) {
  return (
    <div className={styles.card}>
      <h2 className={styles.title}>My Pending Requests</h2>
      <div className={styles.grid}>
        <Link href="/employee/attendance/corrections" className={`${styles.tile} ${styles["tone-green"]}`}>
          <span className={styles.tileIcon}>
            <CalendarCheck size={15} strokeWidth={2} />
          </span>
          <span className={styles.tileValue}>{attendanceCorrections}</span>
          <span className={styles.tileLabel}>Attendance corrections</span>
        </Link>

        <Link href="/employee/leave/history" className={`${styles.tile} ${styles["tone-purple"]}`}>
          <span className={styles.tileIcon}>
            <CalendarDays size={15} strokeWidth={2} />
          </span>
          <span className={styles.tileValue}>{pendingLeave}</span>
          <span className={styles.tileLabel}>Leave requests</span>
        </Link>

        <Link href="/employee/assets" className={`${styles.tile} ${styles["tone-orange"]}`}>
          <span className={styles.tileIcon}>
            <Package size={15} strokeWidth={2} />
          </span>
          <span className={styles.tileValue}>{pendingAssetRequests}</span>
          <span className={styles.tileLabel}>Asset requests</span>
        </Link>

        <Link href="/employee/tasks" className={`${styles.tile} ${styles["tone-pink"]}`}>
          <span className={styles.tileIcon}>
            <ListTodo size={15} strokeWidth={2} />
          </span>
          <span className={styles.tileValue}>{overdueTasks}</span>
          <span className={styles.tileLabel}>Overdue tasks</span>
        </Link>
      </div>
    </div>
  );
}
