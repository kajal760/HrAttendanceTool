"use client";

import { useState } from "react";
import type { LeaveRequest, LeaveRequestStatus } from "@/types/employee";
import { formatDate } from "@/lib/employee/leave-utils";
import styles from "./LeaveRequests.module.css";

const PAGE_SIZE = 5;

const BADGE_CLASS: Record<LeaveRequestStatus, string> = {
  Pending: "badge-pending",
  Approved: "badge-approved",
  Rejected: "badge-rejected",
};

interface LeaveHistoryListProps {
  requests: LeaveRequest[];
}

// Pure prop renderer now - the data is server-fetched (real leave-store,
// not localStorage), so there's nothing for this component to read/merge
// itself.
export default function LeaveHistoryList({ requests }: LeaveHistoryListProps) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  if (requests.length === 0) {
    return <p className={styles.empty}>No leave requests yet.</p>;
  }

  const visibleRequests = requests.slice(0, visibleCount);
  const remaining = requests.length - visibleRequests.length;

  return (
    <>
      <div className={styles.historyList}>
        {visibleRequests.map((req) => (
          <div className={styles.historyRow} key={req.id}>
            <span className={styles.historyType}>{req.category}</span>
            <span className={styles.historyDates}>
              {formatDate(req.startDate)}
              {req.endDate !== req.startDate ? ` – ${formatDate(req.endDate)}` : ""} &middot; {req.days} day
              {req.days === 1 ? "" : "s"}
            </span>
            <span className={`${styles.badge} ${styles[BADGE_CLASS[req.status]]}`}>{req.status}</span>
            <span className={styles.historyReason}>{req.reason}</span>
            {req.decisionNote && (
              <span className={styles.historyReason}>
                <strong>{req.status === "Approved" ? "HR note" : "Reason for rejection"}:</strong> {req.decisionNote}
              </span>
            )}
          </div>
        ))}
      </div>

      {remaining > 0 && (
        <button type="button" className={styles.showMoreButton} onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}>
          Show {Math.min(remaining, PAGE_SIZE)} more
        </button>
      )}
    </>
  );
}
