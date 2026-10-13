"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type { EmployeeOverview } from "@/types/hr";
import ConfirmDialog from "./ConfirmDialog";
import formStyles from "../FormModal.module.css";
import { useDepartmentNames } from "../useDepartmentNames";

interface ManagerOption {
  id: string;
  name: string;
}

interface TransferModalProps {
  employees: EmployeeOverview[];
  managerOptions: ManagerOption[];
  onClose: () => void;
  onSaved: (employee: EmployeeOverview) => void;
}

export default function TransferModal({ employees, managerOptions, onClose, onSaved }: TransferModalProps) {
  const { activeNames } = useDepartmentNames();
  const [employeeId, setEmployeeId] = useState("");
  const [department, setDepartment] = useState("");
  const [designation, setDesignation] = useState("");
  const [managerId, setManagerId] = useState("");
  const [location, setLocation] = useState("");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [reason, setReason] = useState("");
  const [remarks, setRemarks] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const employee = employees.find((e) => e.id === employeeId);

  function validate(): string | null {
    if (!employee) return "Select an employee.";
    if (!department.trim() && !designation.trim() && !location.trim() && !managerId) {
      return "Change at least one of department, designation, location, or manager.";
    }
    return null;
  }

  function handleReview() {
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setConfirming(true);
  }

  async function submitTransfer() {
    if (!employee) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/superadmin/employees/${employee.id}/lifecycle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "transfer",
          department: department.trim() || undefined,
          designation: designation.trim() || undefined,
          location: location.trim() || undefined,
          managerId: managerId || undefined,
          effectiveDate: effectiveDate || undefined,
          reason: reason.trim() || undefined,
          remarks: remarks.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not record transfer.");
        setConfirming(false);
        return;
      }
      onSaved(data.employee);
    } catch {
      setError("Could not record transfer - check your connection and try again.");
      setConfirming(false);
    } finally {
      setSubmitting(false);
    }
  }

  const confirmMessage = employee
    ? `Are you sure you want to transfer ${employee.name} from ${employee.department} to ${department.trim() || employee.department}${
        effectiveDate ? ` effective ${new Date(effectiveDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}` : ""
      }?`
    : "";

  return (
    <div className={formStyles.overlay} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={formStyles.panel} role="dialog" aria-modal="true" aria-label="Employee Transfer">
        <div className={formStyles.panelHeader}>
          <h2 className={formStyles.title}>Employee Transfer</h2>
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
                <option key={e.id} value={e.id}>{e.name} · {e.department}</option>
              ))}
            </select>
          </label>

          {employee && (
            <>
              <div className={formStyles.grid}>
                <label className={formStyles.field}>
                  <span>Current Department</span>
                  <input type="text" value={employee.department} disabled />
                </label>
                <label className={formStyles.field}>
                  <span>Current Designation</span>
                  <input type="text" value={employee.designation} disabled />
                </label>
                <label className={formStyles.field}>
                  <span>Current Reporting Manager</span>
                  <input type="text" value={managerOptions.find((m) => m.id === employee.managerId)?.name ?? "-"} disabled />
                </label>
                <label className={formStyles.field}>
                  <span>Current Location</span>
                  <input type="text" value={employee.location ?? "-"} disabled />
                </label>
              </div>

              <div className={formStyles.grid}>
                <label className={formStyles.field}>
                  <span>New Department</span>
                  <select value={department} onChange={(e) => setDepartment(e.target.value)}>
                    <option value="">No change</option>
                    {(employee.department && !activeNames.includes(employee.department) ? [employee.department, ...activeNames] : activeNames)
                      .filter((d) => d !== employee.department)
                      .map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                  </select>
                </label>
                <label className={formStyles.field}>
                  <span>New Designation</span>
                  <input type="text" value={designation} onChange={(e) => setDesignation(e.target.value)} placeholder={employee.designation} />
                </label>
                <label className={formStyles.field}>
                  <span>New Reporting Manager</span>
                  <select value={managerId} onChange={(e) => setManagerId(e.target.value)}>
                    <option value="">No change</option>
                    {managerOptions.filter((m) => m.id !== employee.id).map((m) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </label>
                <label className={formStyles.field}>
                  <span>New Location</span>
                  <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder={employee.location ?? ""} />
                </label>
              </div>

              <div className={formStyles.grid}>
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
            </>
          )}

          {error && <div className={formStyles.error}>{error}</div>}

          <div className={formStyles.actions}>
            <button type="button" className={formStyles.cancelButton} onClick={onClose}>
              Cancel
            </button>
            <button type="button" className={formStyles.saveButton} onClick={handleReview} disabled={!employee}>
              Submit Transfer
            </button>
          </div>
        </div>
      </div>

      {confirming && employee && (
        <ConfirmDialog
          title="Transfer Employee"
          message={confirmMessage}
          confirmLabel="Confirm Transfer"
          busy={submitting}
          onConfirm={submitTransfer}
          onCancel={() => setConfirming(false)}
        />
      )}
    </div>
  );
}
