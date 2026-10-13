"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { X } from "lucide-react";
import type { EmployeeOverview } from "@/types/hr";
import type { Project } from "@/types/work";
import styles from "./FormModal.module.css";
import { useDepartmentNames } from "./useDepartmentNames";

interface FormState {
  name: string;
  description: string;
  deadline: string;
  departmentName: string;
}

function formFromProject(project?: Project): FormState {
  return {
    name: project?.name ?? "",
    description: project?.description ?? "",
    deadline: project?.deadline ?? "",
    departmentName: project?.departmentName ?? "",
  };
}

interface ProjectFormModalProps {
  mode: "add" | "edit";
  project?: Project;
  employees: EmployeeOverview[];
  onClose: () => void;
  onSaved: (project: Project) => void;
}

export default function ProjectFormModal({ mode, project, employees, onClose, onSaved }: ProjectFormModalProps) {
  const [form, setForm] = useState<FormState>(() => formFromProject(project));
  const { activeNames } = useDepartmentNames();
  const [memberIds, setMemberIds] = useState<string[]>(() => project?.memberIds ?? []);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  function toggleMember(id: string) {
    setMemberIds((prev) => (prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.name.trim()) {
      setError("Project name is required.");
      return;
    }
    if (memberIds.length === 0) {
      setError("Assign at least one employee to this project.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        deadline: form.deadline || undefined,
        departmentName: form.departmentName || undefined,
        memberIds,
      };
      const res = await fetch(
        mode === "add" ? "/api/superadmin/work/projects" : `/api/superadmin/work/projects/${project!.id}`,
        {
          method: mode === "add" ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? `Could not ${mode === "add" ? "add" : "update"} project.`);
        return;
      }
      onSaved(data.project);
    } catch {
      setError(`Could not ${mode === "add" ? "add" : "update"} project - check your connection and try again.`);
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
        aria-label={mode === "add" ? "Add project" : "Update project"}
      >
        <div className={styles.panelHeader}>
          <h2 className={styles.title}>{mode === "add" ? "Add project" : "Update project"}</h2>
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.grid}>
            <label className={`${styles.field} ${styles.fieldWide}`}>
              <span>Project name</span>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </label>
            <label className={`${styles.field} ${styles.fieldWide}`}>
              <span>Description</span>
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="What is this project delivering?"
              />
            </label>
            <label className={styles.field}>
              <span>Deadline (optional)</span>
              <input
                type="date"
                value={form.deadline}
                onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
              />
            </label>
            <label className={styles.field}>
              <span>Department</span>
              <select
                value={form.departmentName}
                onChange={(e) => setForm((f) => ({ ...f, departmentName: e.target.value }))}
              >
                <option value="">No department</option>
                {(form.departmentName && !activeNames.includes(form.departmentName)
                  ? [form.departmentName, ...activeNames]
                  : activeNames
                ).map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </label>
          </div>

          <div className={styles.checklistSection}>
            <span className={styles.checklistTitle}>Assign employees</span>
            <div className={styles.checklist}>
              {employees.map((emp) => (
                <label key={emp.id} className={styles.checklistItem}>
                  <input
                    type="checkbox"
                    checked={memberIds.includes(emp.id)}
                    onChange={() => toggleMember(emp.id)}
                  />
                  {emp.name}
                </label>
              ))}
            </div>
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.actions}>
            <button type="button" className={styles.cancelButton} onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className={styles.saveButton} disabled={submitting}>
              {submitting
                ? mode === "add"
                  ? "Adding..."
                  : "Saving..."
                : mode === "add"
                  ? "Add project"
                  : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
