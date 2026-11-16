"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { LeaveRequest, LeaveRequestStatus } from "@/types/employee";
import { formatDate, todayKey } from "@/lib/employee/leave-utils";
import styles from "./LeaveRequests.module.css";

const PAGE_SIZE = 5;

const BADGE_CLASS: Record<LeaveRequestStatus, string> = {
  Pending: "badge-pending",
  Approved: "badge-approved",
  Rejected: "badge-rejected",
  Cancelled: "badge-cancelled",
};

interface LeaveHistoryListProps {
  requests: LeaveRequest[];
}

// Server-fetched requests, plus the two things an employee can still do to
// one: cancel it (pending, or approved leave that hasn't started) and attach
// a medical certificate when the policy needs one before HR can approve.
export default function LeaveHistoryList({ requests }: LeaveHistoryListProps) {
  const router = useRouter();
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(id: string, request: () => Promise<Response>) {
    setBusyId(id);
    setError(null);
    try {
      const res = await request();
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "That didn't work - try again.");
        return;
      }
      router.refresh();
    } catch {
      setError("Couldn't reach the server - check your connection and try again.");
    } finally {
      setBusyId(null);
    }
  }

  function cancel(id: string) {
    if (!window.confirm("Cancel this leave request?")) return;
    void run(id, () => fetch(`/api/employee/leave/${id}/cancel`, { method: "POST" }));
  }

  function attach(id: string, file: File | undefined) {
    if (!file) return;
    const form = new FormData();
    form.append("file", file);
    void run(id, () => fetch(`/api/employee/leave/${id}/attachment`, { method: "POST", body: form }));
  }

  if (requests.length === 0) {
    return <p className={styles.empty}>No leave requests yet.</p>;
  }

  const visibleRequests = requests.slice(0, visibleCount);
  const remaining = requests.length - visibleRequests.length;

  return (
    <>
      {error && <p className={styles.error}>{error}</p>}
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
            {req.hasAttachment && (
              <span className={styles.historyReason}>
                <a href={`/api/leave/${req.id}/attachment`} target="_blank" rel="noreferrer">
                  View attachment
                </a>
              </span>
            )}
            {req.status === "Pending" && req.certificateRequired && !req.hasAttachment && (
              <label className={styles.historyReason}>
                <strong>Medical certificate needed before HR can approve:</strong>{" "}
                <input
                  type="file"
                  accept="application/pdf,image/jpeg,image/png"
                  disabled={busyId === req.id}
                  onChange={(e) => attach(req.id, e.target.files?.[0])}
                />
              </label>
            )}
            {(req.status === "Pending" || (req.status === "Approved" && req.startDate > todayKey())) && (
              <span className={styles.historyReason}>
                <button
                  type="button"
                  className={styles.cancelButton}
                  disabled={busyId === req.id}
                  onClick={() => cancel(req.id)}
                >
                  Cancel request
                </button>
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
