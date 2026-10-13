"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type { EmployeeOverview } from "@/types/hr";
import ConfirmDialog from "./ConfirmDialog";
import formStyles from "../FormModal.module.css";

interface PromotionModalProps {
  employees: EmployeeOverview[];
  onClose: () => void;
  onSaved: (employee: EmployeeOverview) => void;
}

export default function PromotionModal({ employees, onClose, onSaved }: PromotionModalProps) {
  const [employeeId, setEmployeeId] = useState("");
  const [designation, setDesignation] = useState("");
  const [grade, setGrade] = useState("");
  const [salary, setSalary] = useState("");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [reason, setReason] = useState("");
  const [remarks, setRemarks] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const employee = employees.find((e) => e.id === employeeId);

  function handleReview() {
    if (!employee) {
      setError("Select an employee.");
      return;
    }
    if (!designation.trim()) {
      setError("A new designation is required.");
      return;
    }
    setError(null);
    setConfirming(true);
  }

  async function submitPromotion() {
    if (!employee) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/superadmin/employees/${employee.id}/lifecycle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "promote",
          designation: designation.trim(),
          grade: grade.trim() || undefined,
          salary: salary ? Number(salary) : undefined,
          effectiveDate: effectiveDate || undefined,
          reason: reason.trim() || undefined,
          remarks: remarks.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not record promotion.");
        setConfirming(false);
        return;
      }
      onSaved(data.employee);
    } catch {
      setError("Could not record promotion - check your connection and try again.");
      setConfirming(false);
    } finally {
      setSubmitting(false);
    }
  }

  const confirmMessage = employee
    ? `Are you sure you want to promote ${employee.name} from ${employee.designation} to ${designation.trim()}${
        effectiveDate ? ` effective ${new Date(effectiveDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}` : ""
      }?`
    : "";

  return (
    <div className={formStyles.overlay} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={formStyles.panel} role="dialog" aria-modal="true" aria-label="Employee Promotion">
        <div className={formStyles.panelHeader}>
          <h2 className={formStyles.title}>Employee Promotion</h2>
          <button type="button" className={formStyles.closeButton} onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <div className={formStyles.form}>
          <label className={`${formStyles.field} ${formStyles.fieldWide}`}>
            <span>Employee</span>
            <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
              <option value="">Select employee</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>{e.name} · {e.designation}</option>
              ))}
            </select>
          </label>

          {employee && (
            <div className={formStyles.grid}>
              <label className={formStyles.field}>
                <span>Current Designation</span>
                <input type="text" value={employee.designation} disabled />
              </label>
              <label className={formStyles.field}>
                <span>New Designation</span>
                <input type="text" value={designation} onChange={(e) => setDesignation(e.target.value)} />
              </label>
              <label className={formStyles.field}>
                <span>Current Grade</span>
                <input type="text" value={employee.grade ?? "-"} disabled />
              </label>
              <label className={formStyles.field}>
                <span>New Grade</span>
                <input type="text" value={grade} onChange={(e) => setGrade(e.target.value)} />
              </label>
              <label className={formStyles.field}>
                <span>New Salary (₹/yr, optional)</span>
                <input type="number" min={0} value={salary} onChange={(e) => setSalary(e.target.value)} placeholder={String(employee.salary)} />
              </label>
              <label className={formStyles.field}>
                <span>Effective Date</span>
                <input type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} />
              </label>
              <label className={formStyles.field}>
                <span>Reason</span>
                <input type="text" value={reason} onChange={(e) => setReason(e.target.value)} />
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
              Submit Promotion
            </button>
          </div>
        </div>
      </div>

      {confirming && employee && (
        <ConfirmDialog
          title="Promote Employee"
          message={confirmMessage}
          confirmLabel="Confirm Promotion"
          busy={submitting}
          onConfirm={submitPromotion}
          onCancel={() => setConfirming(false)}
        />
      )}
    </div>
  );
}
