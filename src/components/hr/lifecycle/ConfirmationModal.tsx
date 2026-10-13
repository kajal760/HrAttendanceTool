"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type { ConfirmationStatus, EmployeeOverview } from "@/types/hr";
import ConfirmDialog from "./ConfirmDialog";
import formStyles from "../FormModal.module.css";

const STATUSES: ConfirmationStatus[] = ["Probation", "Confirmation Due", "Confirmed", "Extended"];

function formatDate(iso?: string): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("en-GB", { month: "short", day: "numeric", year: "numeric" });
}

interface ConfirmationModalProps {
  employees: EmployeeOverview[];
  onClose: () => void;
  onSaved: (employee: EmployeeOverview) => void;
}

// "Employee Confirmation" - distinct from the shared ConfirmDialog
// component (one is the HR form, the other is the "are you sure" step
// every lifecycle action goes through before submitting).
export default function ConfirmationModal({ employees, onClose, onSaved }: ConfirmationModalProps) {
  const [employeeId, setEmployeeId] = useState("");
  const [probationStartDate, setProbationStartDate] = useState("");
  const [probationEndDate, setProbationEndDate] = useState("");
  const [confirmationDate, setConfirmationDate] = useState(new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState<ConfirmationStatus>("Confirmed");
  const [remarks, setRemarks] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const employee = employees.find((e) => e.id === employeeId);

  function selectEmployee(id: string) {
    setEmployeeId(id);
    const e = employees.find((x) => x.id === id);
    setProbationStartDate(e?.probationStartDate ?? "");
    setProbationEndDate(e?.probationEndDate ?? "");
    setStatus(e?.confirmationStatus ?? "Confirmation Due");
  }

  function handleReview() {
    if (!employee) {
      setError("Select an employee.");
      return;
    }
    setError(null);
    setConfirming(true);
  }

  async function submitConfirmation() {
    if (!employee) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/superadmin/employees/${employee.id}/lifecycle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "record-confirmation",
          probationStartDate: probationStartDate || undefined,
          probationEndDate: probationEndDate || undefined,
          confirmationDate: confirmationDate || undefined,
          confirmationStatus: status,
          remarks: remarks.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not record confirmation.");
        setConfirming(false);
        return;
      }
      onSaved(data.employee);
    } catch {
      setError("Could not record confirmation - check your connection and try again.");
      setConfirming(false);
    } finally {
      setSubmitting(false);
    }
  }

  const confirmMessage = employee
    ? `Are you sure you want to set ${employee.name}'s confirmation status to "${status}"${
        status === "Confirmed" ? " and move them to Active" : ""
      }?`
    : "";

  return (
    <div className={formStyles.overlay} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={formStyles.panel} role="dialog" aria-modal="true" aria-label="Employee Confirmation">
        <div className={formStyles.panelHeader}>
          <h2 className={formStyles.title}>Employee Confirmation</h2>
          <button type="button" className={formStyles.closeButton} onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <div className={formStyles.form}>
          <label className={`${formStyles.field} ${formStyles.fieldWide}`}>
            <span>Employee</span>
            <select value={employeeId} onChange={(e) => selectEmployee(e.target.value)}>
              <option value="">Select employee</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>{e.name} · {e.status}</option>
              ))}
            </select>
          </label>

          {employee && (
            <div className={formStyles.grid}>
              <label className={formStyles.field}>
                <span>Joining Date</span>
                <input type="text" value={formatDate(employee.joinedOn)} disabled />
              </label>
              <label className={formStyles.field}>
                <span>Probation Start Date</span>
                <input type="date" value={probationStartDate} onChange={(e) => setProbationStartDate(e.target.value)} />
              </label>
              <label className={formStyles.field}>
                <span>Probation End Date</span>
                <input type="date" value={probationEndDate} onChange={(e) => setProbationEndDate(e.target.value)} />
              </label>
              <label className={formStyles.field}>
                <span>Confirmation Date</span>
                <input type="date" value={confirmationDate} onChange={(e) => setConfirmationDate(e.target.value)} />
              </label>
              <label className={formStyles.field}>
                <span>Confirmation Status</span>
                <select value={status} onChange={(e) => setStatus(e.target.value as ConfirmationStatus)}>
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </label>
              <label className={`${formStyles.field} ${formStyles.fieldWide}`}>
                <span>Remarks</span>
                <textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} />
              </label>
            </div>
          )}

          {error && <div className={formStyles.error}>{error}</div>}

          <div className={formStyles.actions}>
            <button type="button" className={formStyles.cancelButton} onClick={onClose}>
              Cancel
            </button>
            <button type="button" className={formStyles.saveButton} onClick={handleReview} disabled={!employee}>
              Submit
            </button>
          </div>
        </div>
      </div>

      {confirming && employee && (
        <ConfirmDialog
          title="Confirm Employee Status"
          message={confirmMessage}
          confirmLabel="Confirm"
          busy={submitting}
          onConfirm={submitConfirmation}
          onCancel={() => setConfirming(false)}
        />
      )}
    </div>
  );
}
