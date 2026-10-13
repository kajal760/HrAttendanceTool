"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { X } from "lucide-react";
import type { EmployeeOverview } from "@/types/hr";
import type { Project, WorkTask, WorkTaskStatus } from "@/types/work";
import styles from "./FormModal.module.css";

const STATUS_OPTIONS: WorkTaskStatus[] = ["Pending", "Ongoing", "Completed"];

interface FormState {
  title: string;
  description: string;
  projectId: string;
  deadline: string;
  status: WorkTaskStatus;
  dependsOnTaskId: string;
}

function formFromTask(task: WorkTask | undefined, defaultProjectId: string): FormState {
  return {
    title: task?.title ?? "",
    description: task?.description ?? "",
    projectId: task?.projectId ?? defaultProjectId,
    deadline: task?.deadline ?? "",
    status: task?.status ?? "Pending",
    dependsOnTaskId: task?.dependsOnTaskId ?? "",
  };
}

interface TaskFormModalProps {
  mode: "add" | "edit";
  task?: WorkTask;
  projects: Project[];
  employees: EmployeeOverview[];
  tasks: WorkTask[];
  onClose: () => void;
  onSaved: (task: WorkTask) => void;
}

export default function TaskFormModal({ mode, task, projects, employees, tasks, onClose, onSaved }: TaskFormModalProps) {
  const [form, setForm] = useState<FormState>(() => formFromTask(task, projects[0]?.id ?? ""));
  const [assigneeIds, setAssigneeIds] = useState<string[]>(() => task?.assigneeIds ?? []);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // A task can only depend on another task in the same project, and never
  // on itself - keeps the picker relevant and rules out the one cycle this
  // app actively guards against (see `work-store.ts`'s `patchTask`).
  const dependableTasks = useMemo(
    () => tasks.filter((t) => t.projectId === form.projectId && t.id !== task?.id),
    [tasks, form.projectId, task?.id],
  );

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const employeesById = useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees]);

  // Only the chosen project's members can be assigned - keeps the checklist
  // relevant and stops a task landing on someone who isn't even on it.
  const assignableEmployees = useMemo(() => {
    const project = projects.find((p) => p.id === form.projectId);
    return (project?.memberIds ?? [])
      .map((id) => employeesById.get(id))
      .filter((e): e is EmployeeOverview => !!e);
  }, [projects, form.projectId, employeesById]);

  function toggleAssignee(id: string) {
    setAssigneeIds((prev) => (prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]));
  }

  function handleProjectChange(projectId: string) {
    const stillDependable = tasks.some((t) => t.projectId === projectId && t.id === form.dependsOnTaskId);
    setForm((f) => ({ ...f, projectId, dependsOnTaskId: stillDependable ? f.dependsOnTaskId : "" }));
    const project = projects.find((p) => p.id === projectId);
    setAssigneeIds((prev) => prev.filter((id) => project?.memberIds.includes(id)));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.title.trim()) {
      setError("Task title is required.");
      return;
    }
    if (!form.projectId) {
      setError("Choose a project.");
      return;
    }
    if (assigneeIds.length === 0) {
      setError("Assign the task to at least one employee.");
      return;
    }
    if (!form.deadline) {
      setError("Choose a deadline.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        projectId: form.projectId,
        assigneeIds,
        deadline: form.deadline,
        status: form.status,
        dependsOnTaskId: form.dependsOnTaskId || null,
      };
      const res = await fetch(
        mode === "add" ? "/api/superadmin/work/tasks" : `/api/superadmin/work/tasks/${task!.id}`,
        {
          method: mode === "add" ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? `Could not ${mode === "add" ? "add" : "update"} task.`);
        return;
      }
      onSaved(data.task);
    } catch {
      setError(`Could not ${mode === "add" ? "add" : "update"} task - check your connection and try again.`);
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
        aria-label={mode === "add" ? "Add task" : "Update task"}
      >
        <div className={styles.panelHeader}>
          <h2 className={styles.title}>{mode === "add" ? "Add task" : "Update task"}</h2>
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.grid}>
            <label className={`${styles.field} ${styles.fieldWide}`}>
              <span>Task title</span>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
            </label>
            <label className={`${styles.field} ${styles.fieldWide}`}>
              <span>Description</span>
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="What needs to get done?"
              />
            </label>
            <label className={styles.field}>
              <span>Project</span>
              <select value={form.projectId} onChange={(e) => handleProjectChange(e.target.value)}>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.field}>
              <span>Deadline</span>
              <input
                type="date"
                value={form.deadline}
                onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
              />
            </label>
            <label className={styles.field}>
              <span>Status</span>
              <select
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as WorkTaskStatus }))}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <label className={`${styles.field} ${styles.fieldWide}`}>
              <span>Depends on (optional)</span>
              <select
                value={form.dependsOnTaskId}
                onChange={(e) => setForm((f) => ({ ...f, dependsOnTaskId: e.target.value }))}
              >
                <option value="">No dependency</option>
                {dependableTasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className={styles.checklistSection}>
            <span className={styles.checklistTitle}>Assign to</span>
            {assignableEmployees.length === 0 ? (
              <p className={styles.hint}>This project has no members yet - add some from the Projects tab first.</p>
            ) : (
              <div className={styles.checklist}>
                {assignableEmployees.map((emp) => (
                  <label key={emp.id} className={styles.checklistItem}>
                    <input
                      type="checkbox"
                      checked={assigneeIds.includes(emp.id)}
                      onChange={() => toggleAssignee(emp.id)}
                    />
                    {emp.name}
                  </label>
                ))}
              </div>
            )}
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
                  ? "Add task"
                  : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
