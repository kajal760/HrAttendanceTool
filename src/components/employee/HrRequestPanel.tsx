"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { HrRequest, HrRequestCategory, RequestRecipient } from "@/types/employee";
import MentionRecipientPicker from "./MentionRecipientPicker";
import styles from "./HrRequestPanel.module.css";

const STORAGE_KEY = "hr-attendance:hr-requests:v1";

const CATEGORIES: { value: HrRequestCategory; label: string }[] = [
  { value: "Leave", label: "Leave" },
  { value: "Work From Office", label: "Work From Office (WFO)" },
  { value: "Work From Home", label: "Work From Home (WFH)" },
  { value: "Query", label: "Query" },
  { value: "Other", label: "Other" },
];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function loadStored(fallback: HrRequest[]): HrRequest[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as HrRequest[]) : fallback;
  } catch {
    return fallback;
  }
}

function saveStored(requests: HrRequest[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(requests));
  } catch {
    // localStorage unavailable - in-memory state still holds for this tab.
  }
}

interface HrRequestPanelProps {
  recipientOptions: RequestRecipient[];
  initialRequests: HrRequest[];
}

// TODO: submit to a real inbox (e.g. `POST /api/requests`) once there's a
// module on the other end to route these to. Until then every request is
// persisted locally and stays "Pending".
export default function HrRequestPanel({
  recipientOptions,
  initialRequests,
}: HrRequestPanelProps) {
  const [requests, setRequests] = useState<HrRequest[]>(initialRequests);
  const [category, setCategory] = useState<HrRequestCategory>("Leave");
  const [otherLabel, setOtherLabel] = useState("");
  const [summary, setSummary] = useState("");
  const [recipients, setRecipients] = useState<RequestRecipient[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setRequests(loadStored(initialRequests));
    // Only merge from storage on mount; initialRequests is a static prop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function resetForm() {
    setCategory("Leave");
    setOtherLabel("");
    setSummary("");
    setRecipients([]);
    setError(null);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (category === "Other" && otherLabel.trim().length === 0) {
      setError("Please specify what \"Other\" refers to.");
      return;
    }
    if (summary.trim().length < 10) {
      setError("Please add a short summary (10+ characters).");
      return;
    }
    if (recipients.length === 0) {
      setError("Add at least one recipient - type @ to mention HR, CFO, or a colleague.");
      return;
    }

    const request: HrRequest = {
      id: `req-${Date.now()}`,
      category,
      otherLabel: category === "Other" ? otherLabel.trim() : undefined,
      summary: summary.trim(),
      recipients,
      status: "Pending",
      submittedAt: new Date().toISOString(),
    };

    const next = [request, ...requests];
    setRequests(next);
    saveStored(next);
    resetForm();
  }

  return (
    <div>
      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.formRow}>
          <label className={styles.field}>
            Type
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as HrRequestCategory)}
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          {category === "Other" && (
            <label className={styles.field}>
              Specify
              <input
                type="text"
                value={otherLabel}
                onChange={(e) => setOtherLabel(e.target.value)}
                placeholder="e.g. Equipment request"
              />
            </label>
          )}
        </div>

        <label className={styles.field}>
          Send to
          <MentionRecipientPicker
            options={recipientOptions}
            value={recipients}
            onChange={setRecipients}
          />
        </label>

        <label className={styles.field}>
          Summary
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Describe your request..."
          />
        </label>

        {error && <span className={styles.error}>{error}</span>}

        <div className={styles.formActions}>
          <button type="submit" className={styles.submitButton}>
            Submit
          </button>
        </div>
      </form>

      {requests.length === 0 ? (
        <p className={styles.empty}>No requests yet.</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Type</th>
              <th>Summary</th>
              <th>Sent to</th>
              <th>Status</th>
              <th>Submitted</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((req) => (
              <tr key={req.id}>
                <td>{req.category === "Other" ? req.otherLabel : req.category}</td>
                <td className={styles.summaryCell}>{req.summary}</td>
                <td>
                  <div className={styles.recipientChips}>
                    {req.recipients.map((r) => (
                      <span className={styles.recipientChip} key={r.id}>
                        @{r.label}
                      </span>
                    ))}
                  </div>
                </td>
                <td>
                  <span className={styles.badge}>{req.status}</span>
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
