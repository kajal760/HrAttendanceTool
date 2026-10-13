"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { LEAVE_CATEGORIES, type LeaveCategory } from "@/types/employee";
import { daysBetween, todayKey } from "@/lib/employee/leave-utils";
import styles from "./LeaveRequests.module.css";

// The old apply modal's form, now a plain inline page (it has its own
// route/tab now, so it no longer needs an overlay). Submits to the real
// `POST /api/employee/leave` - HR needs to see this request to approve or
// reject it, so it can no longer live only in this browser's localStorage.
export default function LeaveApplyForm() {
  const router = useRouter();
  const [category, setCategory] = useState<LeaveCategory>("Casual Leave");
  const [startDate, setStartDate] = useState(todayKey());
  const [endDate, setEndDate] = useState(todayKey());
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const days = daysBetween(startDate, endDate);
    if (days <= 0) {
      setError("End date must be on or after the start date.");
      return;
    }
    if (reason.trim().length < 10) {
      setError("Please add a short reason (10+ characters).");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/employee/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, startDate, endDate, reason: reason.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not submit your request.");
        return;
      }
      router.push("/employee/leave/history");
      router.refresh();
    } catch {
      setError("Could not submit your request - check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.formRow}>
        <label className={styles.field}>
          Leave type
          <select value={category} onChange={(e) => setCategory(e.target.value as LeaveCategory)}>
            {LEAVE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className={styles.formRow}>
        <label className={styles.field}>
          Start date
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
        </label>
        <label className={styles.field}>
          End date
          <input type="date" value={endDate} min={startDate} onChange={(e) => setEndDate(e.target.value)} required />
        </label>
      </div>
      <span className={styles.daysHint}>{daysBetween(startDate, endDate)} day(s)</span>
      <label className={styles.field}>
        Reason
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Add a short reason for this leave..."
          required
        />
      </label>
      {error && <span className={styles.error}>{error}</span>}
      <div className={styles.formActions}>
        <button type="submit" className={styles.submitButton} disabled={submitting}>
          {submitting ? "Submitting..." : "Submit for approval"}
        </button>
      </div>
    </form>
  );
}
