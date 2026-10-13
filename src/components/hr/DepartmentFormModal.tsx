"use client";

import { useEffect, useId, useState } from "react";
import type { FormEvent } from "react";
import { X } from "lucide-react";
import type { Department, EmployeeOverview } from "@/types/hr";
import styles from "./FormModal.module.css";

interface FormState {
  name: string;
  description: string;
}

function formFromDepartment(department?: Department): FormState {
  return {
    name: department?.name ?? "",
    description: department?.description ?? "",
  };
}

function headNameFromDepartment(department: Department | undefined, employees: EmployeeOverview[]): string {
  if (!department?.headId) return "";
  return employees.find((e) => e.id === department.headId)?.name ?? "";
}

interface DepartmentFormModalProps {
  mode: "add" | "edit";
  department?: Department;
  employees: EmployeeOverview[];
  onClose: () => void;
  onSaved: (department: Department) => void;
  // Fired when typing a head name with no match creates a new employee
  // record - lets callers fold the new hire into whichever employee list
  // they're holding so later modals (e.g. "Add employees") see them too.
  onEmployeeCreated?: (employee: EmployeeOverview) => void;
}

// Add/Edit Department. The head field is a free-type combobox (datalist of
// existing employees) rather than a plain select - typing a name that
// doesn't match anyone doesn't block the form, it offers to create that
// person as a new employee record (name only; department = this one,
// designation = "Department Head" as a placeholder) so a manager can name a
// head who hasn't been entered into the system yet, then fill in the rest
// of that employee's record afterward from the Employees page.
export default function DepartmentFormModal({
  mode,
  department,
  employees,
  onClose,
  onSaved,
  onEmployeeCreated,
}: DepartmentFormModalProps) {
  const [form, setForm] = useState<FormState>(() => formFromDepartment(department));
  const [headInput, setHeadInput] = useState(() => headNameFromDepartment(department, employees));
  const [knownEmployees, setKnownEmployees] = useState(employees);
  const [confirmingNewHead, setConfirmingNewHead] = useState<string | null>(null);
  const [creatingHead, setCreatingHead] = useState(false);
  const [newHeadCode, setNewHeadCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const headListId = useId();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  function matchByName(name: string): EmployeeOverview | undefined {
    const lower = name.trim().toLowerCase();
    return knownEmployees.find((e) => e.name.trim().toLowerCase() === lower);
  }

  async function saveDepartment(headId: string | null) {
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        headId,
      };
      const res = await fetch(
        mode === "add" ? "/api/superadmin/departments" : `/api/superadmin/departments/${department!.id}`,
        {
          method: mode === "add" ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? `Could not ${mode === "add" ? "add" : "update"} department.`);
        return;
      }
      onSaved(data.department);
    } catch {
      setError(`Could not ${mode === "add" ? "add" : "update"} department - check your connection and try again.`);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.name.trim()) {
      setError("Department name is required.");
      return;
    }

    const trimmedHead = headInput.trim();
    if (!trimmedHead) {
      await saveDepartment(null);
      return;
    }
    const match = matchByName(trimmedHead);
    if (match) {
      await saveDepartment(match.id);
      return;
    }
    // No existing employee has this name - hold the submit and ask before
    // creating a new record for them.
    setConfirmingNewHead(trimmedHead);
  }

  async function confirmCreateHead() {
    if (!confirmingNewHead) return;
    setCreatingHead(true);
    setError(null);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const slug = confirmingNewHead.toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/^\.+|\.+$/g, "") || "employee";
      const res = await fetch("/api/superadmin/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeCode: newHeadCode.trim(),
          name: confirmingNewHead,
          email: `${slug}.${Date.now()}@pending.hrattendance.example`,
          department: form.name.trim(),
          managerId: null,
          designation: "Department Head",
          joinedOn: today,
          age: 25,
          salary: 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not create the new employee record.");
        return;
      }
      const newEmployee: EmployeeOverview = data.employee;
      setKnownEmployees((prev) => [newEmployee, ...prev]);
      onEmployeeCreated?.(newEmployee);
      setConfirmingNewHead(null);
      await saveDepartment(newEmployee.id);
    } finally {
      setCreatingHead(false);
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
        aria-label={mode === "add" ? "Add department" : "Update department"}
      >
        <div className={styles.panelHeader}>
          <h2 className={styles.title}>{mode === "add" ? "Add department" : "Update department"}</h2>
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.grid}>
            <label className={`${styles.field} ${styles.fieldWide}`}>
              <span>Department name</span>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </label>
            <label className={`${styles.field} ${styles.fieldWide}`}>
              <span>Description (optional)</span>
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="What does this department own?"
              />
            </label>
            <label className={`${styles.field} ${styles.fieldWide}`}>
              <span>Department head</span>
              <input
                type="text"
                list={headListId}
                value={headInput}
                onChange={(e) => {
                  setHeadInput(e.target.value);
                  setConfirmingNewHead(null);
                }}
                placeholder="Type a name, or pick an existing employee"
              />
              <datalist id={headListId}>
                {knownEmployees.map((emp) => (
                  <option key={emp.id} value={emp.name} />
                ))}
              </datalist>
            </label>
          </div>

          {confirmingNewHead && (
            <div className={styles.confirmBanner}>
              <p className={styles.confirmText}>
                No employee named &quot;{confirmingNewHead}&quot; exists yet. Create a new employee record for
                them and assign as department head? You can fill in their remaining details (email,
                designation, salary, ...) from the Employees page afterward.
              </p>
              <label className={styles.field}>
                <span>Employee ID (required)</span>
                <input type="text" value={newHeadCode} onChange={(e) => setNewHeadCode(e.target.value)} placeholder="e.g. HR-2041" />
              </label>
              <div className={styles.confirmActions}>
                <button type="button" className={styles.cancelButton} onClick={() => setConfirmingNewHead(null)}>
                  Edit name
                </button>
                <button
                  type="button"
                  className={styles.saveButton}
                  onClick={confirmCreateHead}
                  disabled={creatingHead || !newHeadCode.trim()}
                >
                  {creatingHead ? "Creating..." : "Create & assign"}
                </button>
              </div>
            </div>
          )}

          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.actions}>
            <button type="button" className={styles.cancelButton} onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className={styles.saveButton} disabled={submitting || !!confirmingNewHead}>
              {submitting
                ? mode === "add"
                  ? "Adding..."
                  : "Saving..."
                : mode === "add"
                  ? "Add department"
                  : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
