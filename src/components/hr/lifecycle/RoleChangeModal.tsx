"use client";

import { useState } from "react";
import { X, AlertTriangle } from "lucide-react";
import type { EmployeeOverview } from "@/types/hr";
import type { Role } from "@/types/auth";
import ConfirmDialog from "./ConfirmDialog";
import formStyles from "../FormModal.module.css";
import styles from "./Lifecycle.module.css";

const ROLES: Role[] = ["Admin", "HR", "Employee"];

interface RoleChangeModalProps {
  employees: EmployeeOverview[];
  // Maps employeeId -> current login role, for employees that have one.
  currentRoles: Record<string, Role | undefined>;
  onClose: () => void;
  onSaved: (employee: EmployeeOverview) => void;
}

export default function RoleChangeModal({ employees, currentRoles, onClose, onSaved }: RoleChangeModalProps) {
  const [employeeId, setEmployeeId] = useState("");
  const [newRole, setNewRole] = useState<Role>("Employee");
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ accountUpdated: boolean } | null>(null);

  const employee = employees.find((e) => e.id === employeeId);
  const currentRole = employee ? currentRoles[employee.id] : undefined;

  function handleReview() {
    if (!employee) {
      setError("Select an employee.");
      return;
    }
    setError(null);
    setConfirming(true);
  }

  async function submitRoleChange() {
    if (!employee) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/superadmin/employees/${employee.id}/lifecycle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "change-role", newRole, reason: reason.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not change role.");
        setConfirming(false);
        return;
      }
      setResult({ accountUpdated: data.accountUpdated });
      onSaved(data.employee);
    } catch {
      setError("Could not change role - check your connection and try again.");
      setConfirming(false);
    } finally {
      setSubmitting(false);
    }
  }

  const confirmMessage = employee
    ? `Are you sure you want to change ${employee.name}'s role from ${currentRole ?? "no account"} to ${newRole}${
        effectiveDate ? ` effective ${new Date(effectiveDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}` : ""
      }?`
    : "";

  return (
    <div className={formStyles.overlay} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={formStyles.panel} role="dialog" aria-modal="true" aria-label="Change Employee Role">
        <div className={formStyles.panelHeader}>
          <h2 className={formStyles.title}>Change Employee Role</h2>
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
                <span>Current Role</span>
                <input type="text" value={currentRole ?? "No login account"} disabled />
              </label>
              <label className={formStyles.field}>
                <span>New Role</span>
                <select value={newRole} onChange={(e) => setNewRole(e.target.value as Role)}>
                  {ROLES.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </label>
              <label className={formStyles.field}>
                <span>Effective Date</span>
                <input type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} />
              </label>
              <label className={`${formStyles.field} ${formStyles.fieldWide}`}>
                <span>Reason</span>
                <textarea value={reason} onChange={(e) => setReason(e.target.value)} />
              </label>
            </div>
          )}

          {employee && (
            <div className={formStyles.confirmBanner}>
              <AlertTriangle size={14} strokeWidth={2.25} />
              <span>Changing the role may change the employee&apos;s system permissions.</span>
            </div>
          )}

          {result && (
            <p className={styles.hint}>
              {result.accountUpdated
                ? "Role updated - takes effect next time they sign in."
                : "No login account is linked to this employee yet, so only the lifecycle record was updated."}
            </p>
          )}

          {error && <div className={formStyles.error}>{error}</div>}

          <div className={formStyles.actions}>
            <button type="button" className={formStyles.cancelButton} onClick={onClose}>
              Cancel
            </button>
            <button type="button" className={formStyles.saveButton} onClick={handleReview} disabled={!employee}>
              Apply Role Change
            </button>
          </div>
        </div>
      </div>

      {confirming && employee && (
        <ConfirmDialog
          title="Change Employee Role"
          message={confirmMessage}
          confirmLabel="Apply Role Change"
          danger
          busy={submitting}
          onConfirm={submitRoleChange}
          onCancel={() => setConfirming(false)}
        />
      )}
    </div>
  );
}
