"use client";

import { useState, type FormEvent } from "react";
import type { CorrectionRequest, CorrectionStatus } from "@/lib/hr/attendance-corrections";
import styles from "./CorrectionRequestPanel.module.css";

const BADGE_CLASS: Record<CorrectionStatus, string> = {
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

interface CorrectionRequestPanelProps {
  initialRequests: CorrectionRequest[];
}

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
  const [submitting, setSubmitting] = useState(false);

  function resetForm() {
    setDate(todayKey());
    setClockIn("09:00");
    setClockOut("");
    setReason("");
    setError(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!date || !clockIn || reason.trim().length < 10) {
      setError(
        "Please pick a date, a requested clock-in time, and a justification (10+ characters).",
      );
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/employee/attendance/corrections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          requestedCheckIn: clockIn,
          requestedCheckOut: clockOut || undefined,
          reason: reason.trim(),
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body?.error ?? "Could not submit the request. Please try again.");
        return;
      }
      setRequests((prev) => [body.request as CorrectionRequest, ...prev]);
      resetForm();
      setShowForm(false);
    } catch {
      setError("Could not submit the request. Please try again.");
    } finally {
      setSubmitting(false);
    }
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
            <button type="submit" className={styles.submitButton} disabled={submitting}>
              {submitting ? "Submitting..." : "Submit for HR approval"}
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
                  {req.requestedCheckIn}
                  {req.requestedCheckOut ? ` – ${req.requestedCheckOut}` : ""}
                </td>
                <td className={styles.reasonCell}>{req.reason}</td>
                <td>
                  <span className={`${styles.badge} ${styles[BADGE_CLASS[req.status]]}`}>
                    {req.status}
                  </span>
                </td>
                <td className={styles.muted}>{formatDate(req.submittedOn)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
