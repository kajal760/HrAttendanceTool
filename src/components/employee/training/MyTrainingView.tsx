"use client";

import { useMemo, useState } from "react";
import { Download, Pencil, X } from "lucide-react";
import type { EmployeeTraining, TrainingAttendance, TrainingStatus } from "@/types/training";
import { TRAINING_ATTENDANCES, TRAINING_STATUSES } from "@/types/training";
import { toneClass, type BadgeTone } from "@/components/hr/lifecycle/badge-tones";
import StatTile from "@/components/hr/StatTile";
import { BookOpen, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import styles from "@/components/hr/lifecycle/Lifecycle.module.css";
import formStyles from "@/components/hr/FormModal.module.css";

const STATUS_TONE: Record<TrainingStatus, BadgeTone> = {
  "Not Started": "gray",
  "In Progress": "blue",
  Completed: "green",
  Overdue: "red",
};

function formatDate(iso?: string): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("en-GB", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" });
}

export default function MyTrainingView({ initialAssignments }: { initialAssignments: EmployeeTraining[] }) {
  const [assignments, setAssignments] = useState<EmployeeTraining[]>(initialAssignments);
  const [status, setStatus] = useState<TrainingStatus | "">("");
  const [updateFor, setUpdateFor] = useState<EmployeeTraining | null>(null);

  const counts = useMemo(() => {
    const c = { total: assignments.length, completed: 0, inProgress: 0, overdue: 0 };
    for (const a of assignments) {
      if (a.status === "Completed") c.completed++;
      if (a.status === "In Progress") c.inProgress++;
      if (a.status === "Overdue") c.overdue++;
    }
    return c;
  }, [assignments]);

  const filtered = useMemo(() => assignments.filter((a) => !status || a.status === status), [assignments, status]);

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 14, marginBottom: 18 }}>
        <StatTile label="Total Trainings" value={counts.total} icon={BookOpen} tone="accent" />
        <StatTile label="Completed" value={counts.completed} icon={CheckCircle2} tone="success" />
        <StatTile label="In Progress" value={counts.inProgress} icon={Clock} tone="info" />
        <StatTile label="Overdue" value={counts.overdue} icon={AlertTriangle} tone="danger" />
      </div>

      <div className={styles.toolbar}>
        <select className={styles.filterSelect} value={status} onChange={(e) => setStatus(e.target.value as TrainingStatus | "")} aria-label="Filter by status">
          <option value="">All statuses</option>
          {TRAINING_STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Training</th>
              <th>Category</th>
              <th>Mode</th>
              <th>Due Date</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Progress</th>
              <th>Certificate</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((a) => (
              <tr key={a.id}>
                <td style={{ fontWeight: 600 }}>{a.programmeName}</td>
                <td>{a.category}</td>
                <td>{a.mode}</td>
                <td className={styles.muted}>{formatDate(a.dueDate)}</td>
                <td>{a.priority}</td>
                <td><span className={toneClass(styles, STATUS_TONE[a.status])}>{a.status}</span></td>
                <td>{a.progress}%</td>
                <td>
                  {a.hasCertificateFile ? (
                    <a href={`/api/employee/training/assignments/${a.id}/certificate`} className={styles.actionButton} style={{ display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none" }}>
                      <Download size={12} strokeWidth={2.25} /> Download
                    </a>
                  ) : "-"}
                </td>
                <td>
                  <button type="button" className={styles.actionButton} onClick={() => setUpdateFor(a)}>
                    <Pencil size={12} strokeWidth={2.25} /> Update
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className={styles.empty}>No trainings assigned to you yet.</div>}
      </div>

      {updateFor && (
        <UpdateModal
          assignment={updateFor}
          onClose={() => setUpdateFor(null)}
          onSaved={(a) => {
            setAssignments((prev) => prev.map((x) => (x.id === a.id ? a : x)));
            setUpdateFor(null);
          }}
        />
      )}
    </div>
  );
}

function UpdateModal({
  assignment,
  onClose,
  onSaved,
}: {
  assignment: EmployeeTraining;
  onClose: () => void;
  onSaved: (a: EmployeeTraining) => void;
}) {
  const [status, setStatus] = useState<TrainingStatus>(assignment.status);
  const [progress, setProgress] = useState(assignment.progress.toString());
  const [attendance, setAttendance] = useState<TrainingAttendance | "">(assignment.attendance ?? "");
  const [feedback, setFeedback] = useState(assignment.feedback ?? "");
  const [completionDate, setCompletionDate] = useState(assignment.completionDate ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/employee/training/assignments/${assignment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          progress: progress ? Number(progress) : undefined,
          attendance: attendance || undefined,
          feedback,
          completionDate: status === "Completed" ? completionDate || new Date().toISOString().slice(0, 10) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not save your update.");
        return;
      }
      onSaved(data.assignment);
    } catch {
      setError("Could not save - check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={formStyles.overlay} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={formStyles.panel} role="dialog" aria-modal="true" aria-label="Update my training">
        <div className={formStyles.panelHeader}>
          <h2 className={formStyles.title}>{assignment.programmeName}</h2>
          <button type="button" className={formStyles.closeButton} onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>
        <form className={formStyles.form} onSubmit={submit}>
          <div className={formStyles.grid}>
            <label className={formStyles.field}>
              <span>Status</span>
              <select value={status} onChange={(e) => setStatus(e.target.value as TrainingStatus)}>
                {TRAINING_STATUSES.filter((s) => s !== "Overdue").map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </label>
            <label className={formStyles.field}>
              <span>Progress (%)</span>
              <input type="number" min="0" max="100" value={progress} onChange={(e) => setProgress(e.target.value)} />
            </label>
            <label className={formStyles.field}>
              <span>Attendance</span>
              <select value={attendance} onChange={(e) => setAttendance(e.target.value as TrainingAttendance | "")}>
                <option value="">Not recorded</option>
                {TRAINING_ATTENDANCES.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </label>
            {status === "Completed" && (
              <label className={formStyles.field}>
                <span>Completion date</span>
                <input type="date" value={completionDate} onChange={(e) => setCompletionDate(e.target.value)} />
              </label>
            )}
            <label className={`${formStyles.field} ${formStyles.fieldWide}`}>
              <span>Your feedback</span>
              <textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="How was the training?" />
            </label>
          </div>
          {error && <div className={formStyles.error}>{error}</div>}
          <div className={formStyles.actions}>
            <button type="button" className={formStyles.cancelButton} onClick={onClose}>Cancel</button>
            <button type="submit" className={formStyles.saveButton} disabled={submitting}>
              {submitting ? "Saving..." : "Save update"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
