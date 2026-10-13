"use client";

import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { Camera, Plus, X } from "lucide-react";
import type { EmployeeOverview } from "@/types/hr";
import styles from "./EmployeeFormModal.module.css";
import { useDepartmentNames } from "./useDepartmentNames";

function departmentOptions(current: string, active: string[]): string[] {
  return current && !active.includes(current) ? [current, ...active] : active;
}


const MAX_PHOTO_BYTES = 2 * 1024 * 1024; // 2MB

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

interface CustomFieldRow {
  key: string;
  label: string;
  value: string;
}

interface FormState {
  employeeCode: string;
  name: string;
  email: string;
  department: string;
  designation: string;
  joinedOn: string;
  age: string;
  salary: string;
}

const EMPTY_FORM: FormState = {
  employeeCode: "",
  name: "",
  email: "",
  department: "",
  designation: "",
  joinedOn: "",
  age: "",
  salary: "",
};

function formFromEmployee(employee: EmployeeOverview): FormState {
  return {
    employeeCode: employee.employeeCode,
    name: employee.name,
    email: employee.email,
    department: employee.department,
    designation: employee.designation,
    joinedOn: employee.joinedOn,
    age: String(employee.age),
    salary: String(employee.salary),
  };
}

function customFieldRowsFromEmployee(employee?: EmployeeOverview): CustomFieldRow[] {
  return (employee?.customFields ?? []).map((f, i) => ({
    key: `existing-${i}`,
    label: f.label,
    value: f.value,
  }));
}

interface EmployeeFormModalProps {
  mode: "add" | "edit";
  employee?: EmployeeOverview;
  onClose: () => void;
  onSaved: (employee: EmployeeOverview) => void;
  // Fired when an in-modal action (activate/deactivate) changes the record
  // without the form being submitted - keeps the grid behind the modal in
  // sync even if the admin then hits Cancel instead of Save changes.
  onEmployeeUpdated?: (employee: EmployeeOverview) => void;
}

// A card centered over a blurred backdrop - covers both "Add employee" and
// "Update employee" (pre-filled from `employee`, diffing department/
// designation against the lifecycle-audited fields so those two still go
// through the lifecycle route instead of the quick-edit PATCH). Managers can
// also attach freeform label/value rows via "Add field" for anything the
// fixed schema doesn't cover.
export default function EmployeeFormModal({ mode, employee, onClose, onSaved, onEmployeeUpdated }: EmployeeFormModalProps) {
  const { activeNames } = useDepartmentNames();
  const [form, setForm] = useState<FormState>(
    mode === "edit" && employee ? formFromEmployee(employee) : EMPTY_FORM,
  );
  const [customFields, setCustomFields] = useState<CustomFieldRow[]>(() =>
    customFieldRowsFromEmployee(employee),
  );
  const [photoUrl, setPhotoUrl] = useState<string | undefined>(employee?.photoUrl);
  const [photoRemoved, setPhotoRemoved] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [deactivated, setDeactivated] = useState(employee?.deactivated ?? false);
  const [statusSubmitting, setStatusSubmitting] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function addCustomField() {
    setCustomFields((rows) => [...rows, { key: `new-${Date.now()}-${rows.length}`, label: "", value: "" }]);
  }

  function updateCustomField(key: string, patch: Partial<Pick<CustomFieldRow, "label" | "value">>) {
    setCustomFields((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function removeCustomField(key: string) {
    setCustomFields((rows) => rows.filter((r) => r.key !== key));
  }

  async function handlePhotoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setPhotoError(null);
    if (!file.type.startsWith("image/")) {
      setPhotoError("Choose an image file.");
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setPhotoError("Image is too large (max 2MB).");
      return;
    }
    try {
      setPhotoUrl(await readFileAsDataUrl(file));
      setPhotoRemoved(false);
    } catch {
      setPhotoError("Could not read that image - try again.");
    }
  }

  async function toggleActiveStatus() {
    if (!employee) return;
    setStatusSubmitting(true);
    setStatusError(null);
    try {
      const res = await fetch(`/api/superadmin/employees/${employee.id}/lifecycle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: deactivated ? "reactivate" : "deactivate" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatusError(data.error ?? "Could not update access.");
        return;
      }
      setDeactivated(data.employee.deactivated);
      onEmployeeUpdated?.(data.employee);
    } catch {
      setStatusError("Could not update access - check your connection and try again.");
    } finally {
      setStatusSubmitting(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const age = Number(form.age);
    const salary = Number(form.salary);
    if (!form.employeeCode.trim()) {
      setError("Enter the employee ID.");
      return;
    }
    if (!form.name.trim() || !form.email.trim() || !form.department.trim() || !form.designation.trim()) {
      setError("Fill in name, email, department, and designation.");
      return;
    }
    if (!form.joinedOn) {
      setError("Choose a joined-on date.");
      return;
    }
    if (!Number.isFinite(age) || age < 16 || age > 80) {
      setError("Age must be a number between 16 and 80.");
      return;
    }
    if (!Number.isFinite(salary) || salary < 0) {
      setError("Salary must be a positive number.");
      return;
    }
    const cleanedCustomFields = customFields
      .map((f) => ({ label: f.label.trim(), value: f.value.trim() }))
      .filter((f) => f.label.length > 0);

    setSubmitting(true);
    try {
      if (mode === "add") {
        const res = await fetch("/api/superadmin/employees", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, age, salary, customFields: cleanedCustomFields, photoUrl: photoRemoved ? null : photoUrl }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Could not add employee.");
          return;
        }
        onSaved(data.employee);
        return;
      }

      if (!employee) return;
      let latest = employee;

      if (form.department.trim() !== employee.department) {
        const res = await fetch(`/api/superadmin/employees/${employee.id}/lifecycle`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "transfer", department: form.department.trim() }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Could not update department.");
          return;
        }
        latest = data.employee;
      }

      if (form.designation.trim() !== employee.designation) {
        const res = await fetch(`/api/superadmin/employees/${employee.id}/lifecycle`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "change-designation", designation: form.designation.trim() }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Could not update designation.");
          return;
        }
        latest = data.employee;
      }

      const res = await fetch(`/api/superadmin/employees/${employee.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeCode: form.employeeCode.trim(),
          name: form.name.trim(),
          email: form.email.trim(),
          joinedOn: form.joinedOn,
          age,
          salary,
          customFields: cleanedCustomFields,
          photoUrl: photoRemoved ? null : photoUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not update employee.");
        return;
      }
      onSaved(data.employee ?? latest);
    } catch {
      setError(`Could not ${mode === "add" ? "add" : "update"} employee - check your connection and try again.`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className={styles.overlay}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-label={mode === "add" ? "Add employee" : "Update employee"}
      >
        <div className={styles.panelHeader}>
          <h2 className={styles.title}>{mode === "add" ? "Add employee" : "Update employee"}</h2>
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <div className={styles.identityRow}>
          <button
            type="button"
            className={styles.photoCircle}
            onClick={() => photoInputRef.current?.click()}
            aria-label={photoUrl ? "Change photo" : "Upload photo"}
          >
            {photoUrl ? (
              <img src={photoUrl} alt="" className={styles.photoImg} />
            ) : (
              <Camera size={18} strokeWidth={2} />
            )}
          </button>
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoChange}
            className={styles.hiddenFileInput}
          />
          <div className={styles.identityRowBody}>
            <span className={styles.photoHint}>
              {photoUrl ? "Replace or remove the photo" : "Click to upload a photo"}
            </span>
            {photoUrl && (
              <div className={styles.photoActions}>
                <button type="button" className={styles.photoActionButton} onClick={() => photoInputRef.current?.click()}>
                  Replace
                </button>
                <button
                  type="button"
                  className={styles.photoRemoveButton}
                  onClick={() => {
                    setPhotoUrl(undefined);
                    setPhotoRemoved(true);
                    setPhotoError(null);
                  }}
                >
                  Remove
                </button>
              </div>
            )}
            {photoError && <span className={styles.error}>{photoError}</span>}
          </div>
          {mode === "edit" && employee && (
            <div className={styles.statusControl}>
              <button
                type="button"
                className={deactivated ? styles.reactivateButton : styles.deactivateButton}
                onClick={toggleActiveStatus}
                disabled={statusSubmitting}
              >
                {statusSubmitting ? "Saving..." : deactivated ? "Activate" : "Deactivate"}
              </button>
              {statusError && <span className={styles.error}>{statusError}</span>}
            </div>
          )}
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.grid}>
            <label className={styles.field}>
              <span>Employee ID</span>
              <input
                type="text"
                value={form.employeeCode}
                onChange={(e) => updateField("employeeCode", e.target.value)}
                placeholder="e.g. HR-2041"
              />
            </label>
            <label className={styles.field}>
              <span>Full name</span>
              <input type="text" value={form.name} onChange={(e) => updateField("name", e.target.value)} />
            </label>
            <label className={styles.field}>
              <span>Email</span>
              <input type="email" value={form.email} onChange={(e) => updateField("email", e.target.value)} />
            </label>
            <label className={styles.field}>
              <span>Department</span>
              <select value={form.department} onChange={(e) => updateField("department", e.target.value)}>
                <option value="">Select department</option>
                {departmentOptions(form.department, activeNames).map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </label>
            <label className={styles.field}>
              <span>Designation</span>
              <input
                type="text"
                value={form.designation}
                onChange={(e) => updateField("designation", e.target.value)}
              />
            </label>
            <label className={styles.field}>
              <span>Joined on</span>
              <input
                type="date"
                value={form.joinedOn}
                onChange={(e) => updateField("joinedOn", e.target.value)}
              />
            </label>
            <label className={styles.field}>
              <span>Age</span>
              <input
                type="number"
                min={16}
                max={80}
                value={form.age}
                onChange={(e) => updateField("age", e.target.value)}
              />
            </label>
            <label className={styles.field}>
              <span>Annual salary (₹)</span>
              <input
                type="number"
                min={0}
                value={form.salary}
                onChange={(e) => updateField("salary", e.target.value)}
              />
            </label>
          </div>

          <div className={styles.customSection}>
            <div className={styles.customHeader}>
              <span className={styles.customTitle}>Custom fields</span>
              <button type="button" className={styles.addFieldButton} onClick={addCustomField}>
                <Plus size={13} strokeWidth={2.5} />
                Add field
              </button>
            </div>
            {customFields.length === 0 && (
              <p className={styles.customHint}>
                No custom fields yet. Add one to track anything extra for this employee.
              </p>
            )}
            {customFields.map((f) => (
              <div key={f.key} className={styles.customRow}>
                <input
                  type="text"
                  placeholder="Field name"
                  value={f.label}
                  onChange={(e) => updateCustomField(f.key, { label: e.target.value })}
                />
                <input
                  type="text"
                  placeholder="Value"
                  value={f.value}
                  onChange={(e) => updateCustomField(f.key, { value: e.target.value })}
                />
                <button
                  type="button"
                  className={styles.removeFieldButton}
                  onClick={() => removeCustomField(f.key)}
                  aria-label="Remove field"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.actions}>
            {mode === "add" && <span className={styles.hint}>Starts at status &quot;Onboarding&quot;</span>}
            <button type="button" className={styles.cancelButton} onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className={styles.saveButton} disabled={submitting}>
              {submitting
                ? mode === "add"
                  ? "Adding..."
                  : "Saving..."
                : mode === "add"
                  ? "Add employee"
                  : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
