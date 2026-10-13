"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { CorrectionRequest, CorrectionRequestStatus } from "@/types/employee";
import styles from "./CorrectionRequestPanel.module.css";

const STORAGE_KEY = "hr-attendance:correction-requests:v1";

const BADGE_CLASS: Record<CorrectionRequestStatus, string> = {
  Pending: "badge-pending",
  Approved: "badge-approved",
  Rejected: "badge-rejected",
};

function todayKey(): string {
  return new Date().toLocaleDateString("en-CA");
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function loadStored(fallback: CorrectionRequest[]): CorrectionRequest[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CorrectionRequest[]) : fallback;
  } catch {
    return fallback;
  }
}

function saveStored(requests: CorrectionRequest[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(requests));
  } catch {
    // localStorage unavailable - in-memory state still holds for this tab.
  }
}

interface CorrectionRequestPanelProps {
  initialRequests: CorrectionRequest[];
}

// TODO: submit to `POST /api/attendance/corrections` for real HR review
// once the backend exists; this persists to localStorage as a stand-in.
export default function CorrectionRequestPanel({
  initialRequests,
}: CorrectionRequestPanelProps) {
  const [requests, setRequests] = useState<CorrectionRequest[]>(initialRequests);
  const [showForm, setShowForm] = useState(false);
  const [date, setDate] = useState(todayKey());
  const [clockIn, setClockIn] = useState("09:00");
  const [clockOut, setClockOut] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setRequests(loadStored(initialRequests));
    // Only merge from storage on mount; initialRequests is a static prop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function resetForm() {
    setDate(todayKey());
    setClockIn("09:00");
    setClockOut("");
    setReason("");
    setError(null);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!date || !clockIn || reason.trim().length < 10) {
      setError(
        "Please pick a date, a requested clock-in time, and a justification (10+ characters).",
      );
      return;
    }

    const request: CorrectionRequest = {
      id: `corr-${Date.now()}`,
      date,
      requestedClockIn: clockIn,
      requestedClockOut: clockOut || undefined,
      reason: reason.trim(),
      status: "Pending",
      submittedAt: new Date().toISOString(),
    };

    const next = [request, ...requests];
    setRequests(next);
    saveStored(next);
    resetForm();
    setShowForm(false);
  }

  return (
    <div>
      <div className={styles.toggleRow}>
        <button
          type="button"
          className={styles.toggleButton}
          onClick={() => setShowForm((v) => !v)}
        >
          {showForm ? "Close" : "New correction request"}
        </button>
      </div>

      {showForm && (
        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.formRow}>
            <label className={styles.field}>
              Date
              <input
                type="date"
                value={date}
                max={todayKey()}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </label>
            <label className={styles.field}>
              Requested clock-in
              <input
                type="time"
                value={clockIn}
                onChange={(e) => setClockIn(e.target.value)}
                required
              />
            </label>
            <label className={styles.field}>
              Requested clock-out (optional)
              <input
                type="time"
                value={clockOut}
                onChange={(e) => setClockOut(e.target.value)}
              />
            </label>
          </div>
          <label className={styles.field}>
            Justification
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain what happened (e.g. missed clock-in, device issue, gate log reference)..."
              required
            />
          </label>
          {error && <span className={styles.error}>{error}</span>}
          <div className={styles.formActions}>
            <button type="submit" className={styles.submitButton}>
              Submit for HR approval
            </button>
            <button
              type="button"
              className={styles.cancelButton}
              onClick={() => {
                resetForm();
                setShowForm(false);
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {requests.length === 0 ? (
        <p className={styles.empty}>No correction requests yet.</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Date</th>
              <th>Requested time</th>
              <th>Reason</th>
              <th>Status</th>
              <th>Submitted</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((req) => (
              <tr key={req.id}>
                <td>{formatDate(req.date)}</td>
                <td className={styles.muted}>
                  {req.requestedClockIn}
                  {req.requestedClockOut ? ` – ${req.requestedClockOut}` : ""}
                </td>
                <td className={styles.reasonCell}>{req.reason}</td>
                <td>
                  <span className={`${styles.badge} ${styles[BADGE_CLASS[req.status]]}`}>
                    {req.status}
                  </span>
                </td>
                <td className={styles.muted}>{formatDate(req.submittedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
