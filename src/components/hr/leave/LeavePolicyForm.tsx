"use client";

import { useState } from "react";
import styles from "./Leave.module.css";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function daysInMonth(monthIndex: number): number {
  // Non-leap year is fine here - this is just populating a day picker.
  return new Date(2026, monthIndex + 1, 0).getDate();
}

// The next date the current leave year's unused balances expire - same
// window logic as `currentLeaveYearRange` in `lib/hr/leave-balance.ts`, but
// computed from the (possibly unsaved) draft month/day so the admin sees it
// update live as they adjust the pickers.
function nextExpiryDate(monthIndex: number, dayOfMonth: number): Date {
  const now = new Date();
  let start = new Date(now.getFullYear(), monthIndex, dayOfMonth);
  if (start.getTime() > now.getTime()) {
    start = new Date(now.getFullYear() - 1, monthIndex, dayOfMonth);
  }
  return new Date(start.getFullYear() + 1, start.getMonth(), start.getDate());
}

function formatExpiry(date: Date): string {
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

interface LeavePolicyFormProps {
  leaveYearStart: string; // "MM-DD"
}

export default function LeavePolicyForm({ leaveYearStart }: LeavePolicyFormProps) {
  const [month, day] = leaveYearStart.split("-").map(Number);
  const [monthIndex, setMonthIndex] = useState(month - 1);
  const [dayOfMonth, setDayOfMonth] = useState(day);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const mm = String(monthIndex + 1).padStart(2, "0");
      const dd = String(dayOfMonth).padStart(2, "0");
      const res = await fetch("/api/superadmin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leaveYearStart: `${mm}-${dd}` }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Could not save the leave policy.");
        return;
      }
      setSaved(true);
    } catch {
      setError("Could not save - check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.policyForm}>
      <div className={styles.policyField}>
        Leave year starts on
        <div className={styles.policyRow}>
          <select
            value={monthIndex}
            onChange={(e) => {
              const next = Number(e.target.value);
              setMonthIndex(next);
              setDayOfMonth((d) => Math.min(d, daysInMonth(next)));
              setSaved(false);
            }}
          >
            {MONTH_NAMES.map((name, i) => (
              <option key={name} value={i}>
                {name}
              </option>
            ))}
          </select>
          <select
            value={dayOfMonth}
            onChange={(e) => {
              setDayOfMonth(Number(e.target.value));
              setSaved(false);
            }}
          >
            {Array.from({ length: daysInMonth(monthIndex) }, (_, i) => i + 1).map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
      </div>
      <p className={styles.policyHint}>
        E.g. 1 July means the leave year runs 1 July {"→"} 30 June, and every employee's used/remaining
        balance resets on that date.
      </p>
      <p className={styles.policyExpiry}>
        Unused leave for the current cycle expires on <strong>{formatExpiry(nextExpiryDate(monthIndex, dayOfMonth))}</strong> - balances reset the next day.
      </p>
      {error && <p className={styles.error}>{error}</p>}
      {saved && <p className={styles.savedNote}>Saved.</p>}
      <button type="button" className={styles.saveButton} disabled={saving} onClick={handleSave}>
        {saving ? "Saving..." : "Save"}
      </button>
    </div>
  );
}
