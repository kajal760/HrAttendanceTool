"use client";

import { useMemo, useState } from "react";
import { Plus, X } from "lucide-react";
import type { EmployeeTraining, TrainingPriority, TrainingProgramme, TrainingStatus } from "@/types/training";
import { TRAINING_PRIORITIES, TRAINING_STATUSES } from "@/types/training";
import { toneClass, type BadgeTone } from "../lifecycle/badge-tones";
import styles from "../lifecycle/Lifecycle.module.css";
import formStyles from "../FormModal.module.css";

interface Person {
  id: string;
  name: string;
  employeeCode: string;
  department: string;
}

const STATUS_TONE: Record<TrainingStatus, BadgeTone> = {
  "Not Started": "gray",
  "In Progress": "blue",
  Completed: "green",
  Overdue: "red",
};

const PRIORITY_TONE: Record<TrainingPriority, BadgeTone> = {
  High: "red",
  Medium: "amber",
  Low: "gray",
};

function formatDate(iso?: string): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("en-GB", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" });
}

export default function AssignedTrainingsView({
  initialAssignments,
  programmes,
  people,
}: {
  initialAssignments: EmployeeTraining[];
  programmes: TrainingProgramme[];
  people: Person[];
}) {
  const [assignments, setAssignments] = useState<EmployeeTraining[]>(initialAssignments);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<TrainingStatus | "">("");
  const [assignOpen, setAssignOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeProgrammes = useMemo(() => programmes.filter((p) => p.isActive), [programmes]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return assignments.filter((a) => {
      if (q && !(a.employeeName.toLowerCase().includes(q) || a.programmeName.toLowerCase().includes(q))) return false;
      if (status && a.status !== status) return false;
      return true;
    });
  }, [assignments, query, status]);

  return (
    <div>
      <div className={styles.toolbar}>
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Search employee or training..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select className={styles.filterSelect} value={status} onChange={(e) => setStatus(e.target.value as TrainingStatus | "")} aria-label="Filter by status">
          <option value="">All statuses</option>
          {TRAINING_STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <button type="button" className={styles.primaryButton} onClick={() => setAssignOpen(true)}>
          <Plus size={14} strokeWidth={2.25} /> Assign training
        </button>
      </div>

      {error && <p style={{ fontSize: 12, color: "var(--color-danger)", margin: "0 0 10px" }}>{error}</p>}

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Employee</th>
              <th>Department</th>
              <th>Training</th>
              <th>Assigned Date</th>
              <th>Assigned By</th>
              <th>Due Date</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Progress</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((a) => (
              <tr key={a.id}>
                <td style={{ fontWeight: 600 }}>{a.employeeName}</td>
                <td className={styles.muted}>{a.department ?? "-"}</td>
                <td>{a.programmeName}</td>
                <td className={styles.muted}>{formatDate(a.assignedDate)}</td>
                <td className={styles.muted}>{a.assignedBy ?? "-"}</td>
                <td className={styles.muted}>{formatDate(a.dueDate)}</td>
                <td><span className={toneClass(styles, PRIORITY_TONE[a.priority])}>{a.priority}</span></td>
                <td><span className={toneClass(styles, STATUS_TONE[a.status])}>{a.status}</span></td>
                <td>{a.progress}%</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className={styles.empty}>No assigned trainings match these filters.</div>}
      </div>

      {assignOpen && (
        <AssignModal
          programmes={activeProgrammes}
          people={people}
          onClose={() => setAssignOpen(false)}
          onAssigned={(a) => {
            setAssignments((prev) => [a, ...prev]);
            setAssignOpen(false);
          }}
        />
      )}
    </div>
  );
}

function AssignModal({
  programmes,
  people,
  onClose,
  onAssigned,
}: {
  programmes: TrainingProgramme[];
  people: Person[];
  onClose: () => void;
  onAssigned: (a: EmployeeTraining) => void;
}) {
  const [programmeId, setProgrammeId] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [assignedDate, setAssignedDate] = useState(new Date().toISOString().slice(0, 10));
  const [assignedBy, setAssignedBy] = useState("HR");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<TrainingPriority>("Medium");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!programmeId || !employeeId) {
      setError("Select a training programme and an employee.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/superadmin/training/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ programmeId, employeeId, assignedDate, assignedBy, dueDate: dueDate || undefined, priority }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not assign this training.");
        return;
      }
      onAssigned(data.assignment);
    } catch {
      setError("Could not assign - check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={formStyles.overlay} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={formStyles.panel} role="dialog" aria-modal="true" aria-label="Assign training">
        <div className={formStyles.panelHeader}>
          <h2 className={formStyles.title}>Assign training</h2>
          <button type="button" className={formStyles.closeButton} onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>
        <form className={formStyles.form} onSubmit={submit}>
          <div className={formStyles.grid}>
            <label className={`${formStyles.field} ${formStyles.fieldWide}`}>
              <span>Training programme</span>
              <select value={programmeId} onChange={(e) => setProgrammeId(e.target.value)}>
                <option value="">Select programme</option>
                {programmes.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} ({p.trainingRef})</option>
                ))}
              </select>
            </label>
            <label className={`${formStyles.field} ${formStyles.fieldWide}`}>
              <span>Employee</span>
              <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
                <option value="">Select employee</option>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} ({p.employeeCode}) · {p.department}</option>
                ))}
              </select>
            </label>
            <label className={formStyles.field}>
              <span>Assigned date</span>
              <input type="date" value={assignedDate} onChange={(e) => setAssignedDate(e.target.value)} />
            </label>
            <label className={formStyles.field}>
              <span>Assigned by</span>
              <input type="text" value={assignedBy} onChange={(e) => setAssignedBy(e.target.value)} placeholder="HR or Manager" />
            </label>
            <label className={formStyles.field}>
              <span>Due date</span>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </label>
            <label className={formStyles.field}>
              <span>Priority</span>
              <select value={priority} onChange={(e) => setPriority(e.target.value as TrainingPriority)}>
                {TRAINING_PRIORITIES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </label>
          </div>
          {error && <div className={formStyles.error}>{error}</div>}
          <div className={formStyles.actions}>
            <button type="button" className={formStyles.cancelButton} onClick={onClose}>Cancel</button>
            <button type="submit" className={formStyles.saveButton} disabled={submitting}>
              {submitting ? "Assigning..." : "Assign training"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
