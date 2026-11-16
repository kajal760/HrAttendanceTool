"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { CheckCircle2, Plus } from "lucide-react";
import type { TrainingAssignedBy, TrainingAssignment, TrainingPriority } from "@/types/training";
import { TRAINING_ASSIGNED_BY, TRAINING_PRIORITIES } from "@/types/training";
import styles from "./EmployeeProfile.module.css";
import lifecycleStyles from "./lifecycle/Lifecycle.module.css";

// No backend training module yet, so assignments are localStorage-only -
// same "TODO: wire to a real endpoint" convention as the generic HR
// Requests / Asset Requests panels. Keyed company-wide, filtered to this
// employee below, so every Employee Master page reads/writes the same list.
const STORAGE_KEY = "hr-attendance:trainings:v1";

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function loadAll(): TrainingAssignment[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as TrainingAssignment[]) : [];
  } catch {
    return [];
  }
}

function saveAll(list: TrainingAssignment[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // localStorage unavailable - in-memory state still holds for this tab.
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

type TrainingStatus = "Completed" | "Overdue" | "Pending";

function trainingStatus(t: TrainingAssignment): TrainingStatus {
  if (t.completed) return "Completed";
  if (t.dueDate < todayKey()) return "Overdue";
  return "Pending";
}

const STATUS_COLOR: Record<TrainingStatus, { color: string; background: string }> = {
  Completed: { color: "var(--color-success)", background: "var(--color-success-bg)" },
  Pending: { color: "var(--color-warning)", background: "var(--color-warning-bg)" },
  Overdue: { color: "var(--color-danger)", background: "var(--color-danger-bg)" },
};

const PRIORITY_COLOR: Record<TrainingPriority, { color: string; background: string }> = {
  High: { color: "var(--color-danger)", background: "var(--color-danger-bg)" },
  Medium: { color: "var(--color-warning)", background: "var(--color-warning-bg)" },
  Low: { color: "var(--color-text-muted)", background: "var(--color-bg)" },
};

interface TrainingPanelProps {
  employeeId: string;
}

// Read-only-ish Training tab on the Employee Master - who assigned what
// training, by when, and whether it's done. Employee ID/Name/Department/
// Designation already sit in this page's header, so each row here only
// needs the training-specific fields.
export default function TrainingPanel({ employeeId }: TrainingPanelProps) {
  const [all, setAll] = useState<TrainingAssignment[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [assignedBy, setAssignedBy] = useState<TrainingAssignedBy>("HR");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<TrainingPriority>("Medium");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setAll(loadAll());
  }, []);

  const assignments = all
    .filter((t) => t.employeeId === employeeId)
    .sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1));

  function persist(next: TrainingAssignment[]) {
    setAll(next);
    saveAll(next);
  }

  function assign(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("Give the training a name.");
      return;
    }
    if (!dueDate) {
      setError("Set a due date.");
      return;
    }
    setError(null);
    const entry: TrainingAssignment = {
      id: `training-${Date.now()}`,
      employeeId,
      title: title.trim(),
      assignedDate: todayKey(),
      assignedBy,
      dueDate,
      priority,
      completed: false,
    };
    persist([entry, ...all]);
    setTitle("");
    setDueDate("");
    setPriority("Medium");
    setAssignedBy("HR");
    setFormOpen(false);
  }

  function markCompleted(id: string) {
    persist(all.map((t) => (t.id === id ? { ...t, completed: true, completedDate: todayKey() } : t)));
  }

  return (
    <div className={styles.panel}>
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>Training</h3>
          <button type="button" className={styles.addRowButton} onClick={() => setFormOpen((o) => !o)}>
            <Plus size={13} /> Assign Training
          </button>
        </div>

        {formOpen && (
          <form className={styles.formGrid} onSubmit={assign} style={{ marginBottom: 14 }}>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Training name</span>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. POSH Awareness" />
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Assigned by</span>
              <select value={assignedBy} onChange={(e) => setAssignedBy(e.target.value as TrainingAssignedBy)}>
                {TRAINING_ASSIGNED_BY.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Due date</span>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Priority</span>
              <select value={priority} onChange={(e) => setPriority(e.target.value as TrainingPriority)}>
                {TRAINING_PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>
            <div className={styles.actionFormActions}>
              <button type="submit" className={styles.saveButton}>
                Assign
              </button>
              <button type="button" className={styles.cancelButton} onClick={() => setFormOpen(false)}>
                Cancel
              </button>
            </div>
          </form>
        )}
        {error && <div className={styles.error}>{error}</div>}

        {assignments.length === 0 ? (
          <div className={styles.emptyHint}>No training assigned to this employee yet.</div>
        ) : (
          <div className={lifecycleStyles.tableWrap}>
            <table className={lifecycleStyles.table}>
              <thead>
                <tr>
                  <th>Training</th>
                  <th>Assigned Date</th>
                  <th>Assigned By</th>
                  <th>Due Date</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {assignments.map((t) => {
                  const status = trainingStatus(t);
                  return (
                    <tr key={t.id}>
                      <td style={{ fontWeight: 600 }}>{t.title}</td>
                      <td className={lifecycleStyles.muted}>{formatDate(t.assignedDate)}</td>
                      <td className={lifecycleStyles.muted}>{t.assignedBy}</td>
                      <td className={lifecycleStyles.muted}>{formatDate(t.dueDate)}</td>
                      <td>
                        <span className={lifecycleStyles.badge} style={PRIORITY_COLOR[t.priority]}>
                          {t.priority}
                        </span>
                      </td>
                      <td>
                        <span className={lifecycleStyles.badge} style={STATUS_COLOR[status]}>
                          {status}
                        </span>
                      </td>
                      <td>
                        {!t.completed && (
                          <button type="button" className={styles.addRowButton} onClick={() => markCompleted(t.id)}>
                            <CheckCircle2 size={13} /> Mark done
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
