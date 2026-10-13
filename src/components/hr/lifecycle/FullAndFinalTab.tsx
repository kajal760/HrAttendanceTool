"use client";

import { useState } from "react";
import type { EmployeeOverview } from "@/types/hr";
import { toneClass } from "./badge-tones";
import styles from "./Lifecycle.module.css";

function formatDate(iso?: string): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("en-GB", { month: "short", day: "numeric", year: "numeric" });
}

function formatAmount(amount?: number): string {
  return amount !== undefined ? `₹${amount.toLocaleString("en-IN")}` : "-";
}

interface FullAndFinalTabProps {
  employees: EmployeeOverview[];
  onEmployeeUpdated: (employee: EmployeeOverview) => void;
  onViewLifecycle: (id: string) => void;
}

// Every separated employee's Full & Final settlement, in one place -
// recording it posts the existing `record-fnf` lifecycle action (same one
// the per-employee profile page already supports), so there's no new
// backend here, just a dedicated view.
export default function FullAndFinalTab({ employees, onEmployeeUpdated, onViewLifecycle }: FullAndFinalTabProps) {
  const [recordingId, setRecordingId] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [settled, setSettled] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const separated = employees.filter((e) => e.status === "Resigned" || e.status === "Exited");
  const pending = separated.filter((e) => !e.exit?.fnfSettled);
  const settledList = separated.filter((e) => e.exit?.fnfSettled);

  function startRecording(employee: EmployeeOverview) {
    setRecordingId(employee.id);
    setAmount(employee.exit?.fnfAmount !== undefined ? String(employee.exit.fnfAmount) : "");
    setNotes(employee.exit?.fnfNotes ?? "");
    setSettled(employee.exit?.fnfSettled ?? false);
    setError(null);
  }

  async function submit(employeeId: string) {
    const amountNum = Number(amount);
    if (Number.isNaN(amountNum) || amountNum < 0) {
      setError("Enter a valid settlement amount.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/superadmin/employees/${employeeId}/lifecycle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "record-fnf", amount: amountNum, notes: notes.trim() || undefined, settled }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not record this settlement.");
        return;
      }
      onEmployeeUpdated(data.employee);
      setRecordingId(null);
    } finally {
      setSubmitting(false);
    }
  }

  function row(employee: EmployeeOverview) {
    const isRecording = recordingId === employee.id;
    return (
      <div className={styles.tableWrap} key={employee.id} style={{ marginBottom: 10 }}>
        <div style={{ padding: 14, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 14, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontWeight: 600 }}>{employee.name}</div>
            <div className={styles.muted} style={{ fontSize: 12 }}>
              {employee.department} &middot; Last working day {formatDate(employee.exit?.lastWorkingDay)}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <span className={toneClass(styles, employee.exit?.fnfSettled ? "green" : "amber")}>
              {employee.exit?.fnfSettled ? "Settled" : "Pending"}
            </span>
            <div className={styles.muted} style={{ fontSize: 12, marginTop: 4 }}>
              {formatAmount(employee.exit?.fnfAmount)}
              {employee.exit?.fnfNotes ? ` · ${employee.exit.fnfNotes}` : ""}
            </div>
          </div>
        </div>

        {isRecording ? (
          <div style={{ padding: "0 14px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <label className={styles.muted} style={{ fontSize: 12, display: "flex", flexDirection: "column", gap: 4 }}>
                Amount
                <input
                  type="number"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  style={{ padding: "6px 8px", borderRadius: 6, border: "1px solid var(--color-border)" }}
                />
              </label>
              <label className={styles.muted} style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 6, marginTop: 18 }}>
                <input type="checkbox" checked={settled} onChange={(e) => setSettled(e.target.checked)} />
                Settled
              </label>
            </div>
            <label className={styles.muted} style={{ fontSize: 12, display: "flex", flexDirection: "column", gap: 4 }}>
              Notes
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                style={{ padding: "6px 8px", borderRadius: 6, border: "1px solid var(--color-border)", minHeight: 60, resize: "vertical" }}
              />
            </label>
            {error && <span style={{ fontSize: 12, color: "var(--color-danger)" }}>{error}</span>}
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" className={styles.primaryButton} disabled={submitting} onClick={() => submit(employee.id)}>
                {submitting ? "Saving..." : "Save"}
              </button>
              <button type="button" className={styles.actionButton} onClick={() => setRecordingId(null)}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div style={{ padding: "0 14px 14px", display: "flex", gap: 10 }}>
            <button type="button" className={styles.actionButton} onClick={() => startRecording(employee)}>
              {employee.exit?.fnfSettled ? "Edit settlement" : "Record settlement"}
            </button>
            <button type="button" className={styles.actionButton} onClick={() => onViewLifecycle(employee.id)}>
              View lifecycle
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className={styles.statGrid}>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{pending.length}</span>
          <span className={styles.statLabel}>Pending</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{settledList.length}</span>
          <span className={styles.statLabel}>Settled</span>
        </div>
      </div>

      {separated.length === 0 ? (
        <div className={styles.empty}>No separated employees yet.</div>
      ) : (
        <>
          {pending.length > 0 && (
            <>
              <h3 style={{ fontSize: 13, fontWeight: 700, margin: "16px 0 10px" }}>Pending</h3>
              {pending.map(row)}
            </>
          )}
          {settledList.length > 0 && (
            <>
              <h3 style={{ fontSize: 13, fontWeight: 700, margin: "16px 0 10px" }}>Settled</h3>
              {settledList.map(row)}
            </>
          )}
        </>
      )}
    </div>
  );
}
