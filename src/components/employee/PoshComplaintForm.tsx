"use client";

import { useState, type FormEvent } from "react";
import type { PoshComplaint } from "@/types/posh";
import styles from "./LeaveRequests.module.css";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function statusBadgeClass(status: PoshComplaint["status"]): string {
  if (status === "Resolved") return styles["badge-approved"];
  if (status === "Under Review") return styles["badge-pending"];
  return styles["badge-rejected"];
}

interface PoshComplaintFormProps {
  initialComplaints: PoshComplaint[];
}

// A confidential channel to report a POSH (Prevention of Sexual Harassment)
// concern straight to HR - separate from the general Requests form, and
// supports filing anonymously (see posh-store.ts: an anonymous submission
// is never linked back to the employee's id, even here).
export default function PoshComplaintForm({ initialComplaints }: PoshComplaintFormProps) {
  const [complaints, setComplaints] = useState<PoshComplaint[]>(initialComplaints);
  const [respondent, setRespondent] = useState("");
  const [description, setDescription] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (description.trim().length < 10) {
      setError("Please describe what happened (10+ characters).");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/employee/posh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: description.trim(), respondent: respondent.trim(), anonymous }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not submit your complaint.");
        return;
      }
      if (!anonymous) {
        setComplaints((prev) => [data.complaint, ...prev]);
      }
      setRespondent("");
      setDescription("");
      setAnonymous(false);
      setSubmitted(true);
    } catch {
      setError("Could not submit your complaint - check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <p style={{ fontSize: 12.5, color: "var(--color-text-muted)", margin: "0 0 14px" }}>
        This goes directly to HR and is handled confidentially. You can file it anonymously if you prefer -
        an anonymous complaint isn&apos;t linked back to your name or employee record.
      </p>

      <form className={styles.form} onSubmit={handleSubmit}>
        <label className={styles.field}>
          Who or which team is this about? (optional)
          <input
            type="text"
            value={respondent}
            onChange={(e) => setRespondent(e.target.value)}
            placeholder="Leave blank if not applicable"
          />
        </label>
        <label className={styles.field}>
          What happened?
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the incident - date, location, and what occurred..."
            required
          />
        </label>
        <label className={styles.field} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <input
            type="checkbox"
            checked={anonymous}
            onChange={(e) => setAnonymous(e.target.checked)}
            style={{ width: "auto" }}
          />
          File this anonymously
        </label>
        {error && <span className={styles.error}>{error}</span>}
        {submitted && !error && (
          <span style={{ fontSize: 12, color: "var(--color-success)" }}>
            Your complaint was submitted to HR.
          </span>
        )}
        <div className={styles.formActions}>
          <button type="submit" className={styles.submitButton} disabled={submitting}>
            {submitting ? "Submitting..." : "Submit complaint"}
          </button>
        </div>
      </form>

      {complaints.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, margin: "0 0 10px" }}>Your past complaints</h3>
          <div className={styles.historyList}>
            {complaints.map((c) => (
              <div key={c.id} className={styles.historyRow}>
                <span className={styles.historyType}>{c.respondent || "General complaint"}</span>
                <span className={`${styles.badge} ${statusBadgeClass(c.status)}`}>{c.status}</span>
                <span className={styles.historyDates}>Filed {formatDate(c.submittedAt)}</span>
                <span className={styles.historyReason}>{c.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
