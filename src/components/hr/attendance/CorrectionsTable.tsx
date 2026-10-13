"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type { CorrectionStatus } from "@/lib/hr/attendance-corrections";
import { toneClass, type BadgeTone } from "../lifecycle/badge-tones";
import styles from "../lifecycle/Lifecycle.module.css";
import formStyles from "../FormModal.module.css";

export interface CorrectionRow {
  id: string;
  employeeName: string;
  employeeCode: string;
  department: string;
  date: string;
  requested: string;
  reason: string;
  current: string;
  status: CorrectionStatus;
  submittedOn: string;
}

const STATUS_TONE: Record<CorrectionStatus, BadgeTone> = {
  Pending: "amber",
  Approved: "green",
  Rejected: "red",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" });
}

// Corrections are decided from here - Approve/Reject change the stored
// request; the current attendance record itself is shown for reference.
export default function CorrectionsTable({ initialRows }: { initialRows: CorrectionRow[] }) {
  const [rows, setRows] = useState(initialRows);
  const [detail, setDetail] = useState<CorrectionRow | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function decide(row: CorrectionRow, status: "Approved" | "Rejected") {
    setBusyId(row.id);
    setError(null);
    try {
      const res = await fetch(`/api/superadmin/attendance/corrections/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not update this request.");
        return;
      }
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, status } : r)));
      setDetail((d) => (d && d.id === row.id ? { ...d, status } : d));
    } catch {
      setError("Could not update this request - check your connection and try again.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      {error && <p style={{ fontSize: 12, color: "var(--color-danger)", margin: "0 0 10px" }}>{error}</p>}
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Employee</th>
              <th>Date</th>
              <th>Requested correction</th>
              <th>Reason</th>
              <th>Current record</th>
              <th>Status</th>
              <th>Submitted</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>
                  <span style={{ fontWeight: 600 }}>{r.employeeName}</span>
                  <div className={styles.muted}>{r.employeeCode}</div>
                </td>
                <td>{formatDate(r.date)}</td>
                <td>{r.requested}</td>
                <td className={styles.muted} style={{ maxWidth: 240 }}>{r.reason}</td>
                <td>{r.current}</td>
                <td>
                  <span className={toneClass(styles, STATUS_TONE[r.status])}>{r.status}</span>
                </td>
                <td>{formatDate(r.submittedOn)}</td>
                <td style={{ whiteSpace: "nowrap", display: "flex", gap: 6 }}>
                  {r.status === "Pending" && (
                    <>
                      <button type="button" className={styles.actionButton} disabled={busyId === r.id} onClick={() => decide(r, "Approved")}>
                        Approve
                      </button>
                      <button type="button" className={styles.actionButton} style={{ color: "var(--color-danger)" }} disabled={busyId === r.id} onClick={() => decide(r, "Rejected")}>
                        Reject
                      </button>
                    </>
                  )}
                  <button type="button" className={styles.actionButton} onClick={() => setDetail(r)}>
                    View Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <div className={styles.empty}>No correction requests.</div>}
      </div>

      {detail && (
        <div className={formStyles.overlay} onMouseDown={(e) => e.target === e.currentTarget && setDetail(null)}>
          <div className={formStyles.panel} role="dialog" aria-modal="true" aria-label="Correction details">
            <div className={formStyles.panelHeader}>
              <h2 className={formStyles.title}>Correction request</h2>
              <button type="button" className={formStyles.closeButton} onClick={() => setDetail(null)} aria-label="Close">
                <X size={16} />
              </button>
            </div>
            <div className={styles.factGrid}>
              <div className={styles.fact}><span className={styles.factLabel}>Employee</span><span className={styles.factValue}>{detail.employeeName} ({detail.employeeCode})</span></div>
              <div className={styles.fact}><span className={styles.factLabel}>Department</span><span className={styles.factValue}>{detail.department}</span></div>
              <div className={styles.fact}><span className={styles.factLabel}>Date</span><span className={styles.factValue}>{formatDate(detail.date)}</span></div>
              <div className={styles.fact}><span className={styles.factLabel}>Submitted</span><span className={styles.factValue}>{formatDate(detail.submittedOn)}</span></div>
              <div className={styles.fact}><span className={styles.factLabel}>Requested correction</span><span className={styles.factValue}>{detail.requested}</span></div>
              <div className={styles.fact}><span className={styles.factLabel}>Current record</span><span className={styles.factValue}>{detail.current}</span></div>
              <div className={styles.fact} style={{ gridColumn: "1 / -1" }}><span className={styles.factLabel}>Reason</span><span className={styles.factValue}>{detail.reason}</span></div>
              <div className={styles.fact}><span className={styles.factLabel}>Status</span><span className={toneClass(styles, STATUS_TONE[detail.status])}>{detail.status}</span></div>
            </div>
            {detail.status === "Pending" && (
              <div className={formStyles.actions} style={{ marginTop: 14 }}>
                <button type="button" className={formStyles.cancelButton} disabled={busyId === detail.id} onClick={() => decide(detail, "Rejected")}>
                  Reject
                </button>
                <button type="button" className={formStyles.saveButton} disabled={busyId === detail.id} onClick={() => decide(detail, "Approved")}>
                  Approve
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
