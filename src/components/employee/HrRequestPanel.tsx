"use client";

import { useState, type FormEvent } from "react";
import type { HrRequest, HrRequestCategory, RequestRecipient } from "@/types/employee";
import MentionRecipientPicker from "./MentionRecipientPicker";
import styles from "./HrRequestPanel.module.css";

const STORAGE_KEY = "hr-attendance:hr-requests:v1";
// Fired after a new request is saved, so `AllRequestsHistory` (a sibling
// component, not a parent/child - they don't share React state) knows to
// re-read localStorage instead of only on its own mount.
export const HR_REQUESTS_UPDATED_EVENT = "hr-attendance:hr-requests:updated";

const CATEGORIES: { value: HrRequestCategory; label: string }[] = [
  { value: "Leave", label: "Leave" },
  { value: "Work From Office", label: "Work From Office (WFO)" },
  { value: "Work From Home", label: "Work From Home (WFH)" },
  { value: "Query", label: "Query" },
  { value: "Other", label: "Other" },
];

function loadStored(): HrRequest[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as HrRequest[]) : [];
  } catch {
    return [];
  }
}

function saveStored(requests: HrRequest[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(requests));
  } catch {
    // localStorage unavailable - the request just won't persist past this submit.
  }
  window.dispatchEvent(new Event(HR_REQUESTS_UPDATED_EVENT));
}

interface HrRequestPanelProps {
  recipientOptions: RequestRecipient[];
}

// TODO: submit to a real inbox (e.g. `POST /api/requests`) once there's a
// module on the other end to route these to. Until then every request is
// persisted locally and stays "Pending". The submitted list itself renders
// in `AllRequestsHistory` below (the "All requests" section), not here -
// this panel is just the form.
export default function HrRequestPanel({ recipientOptions }: HrRequestPanelProps) {
  const [category, setCategory] = useState<HrRequestCategory>("Leave");
  const [otherLabel, setOtherLabel] = useState("");
  const [summary, setSummary] = useState("");
  const [recipients, setRecipients] = useState<RequestRecipient[]>([]);
  const [error, setError] = useState<string | null>(null);

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

    saveStored([request, ...loadStored()]);
    resetForm();
  }

  return (
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
  );
}
