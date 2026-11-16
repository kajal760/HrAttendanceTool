"use client";

import { useMemo, useState } from "react";
import { Pencil, X } from "lucide-react";
import type { EmployeeTraining, TrainingAttendance, TrainingStatus } from "@/types/training";
import { TRAINING_ATTENDANCES, TRAINING_STATUSES } from "@/types/training";
import { toneClass, type BadgeTone } from "../lifecycle/badge-tones";
import styles from "../lifecycle/Lifecycle.module.css";
import formStyles from "../FormModal.module.css";

const STATUS_TONE: Record<TrainingStatus, BadgeTone> = {
  "Not Started": "gray",
  "In Progress": "blue",
  Completed: "green",
  Overdue: "red",
};

export default function TrainingProgressView({ initialAssignments }: { initialAssignments: EmployeeTraining[] }) {
  const [assignments, setAssignments] = useState<EmployeeTraining[]>(initialAssignments);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<TrainingStatus | "">("");
  const [editFor, setEditFor] = useState<EmployeeTraining | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      </div>

      {error && <p style={{ fontSize: 12, color: "var(--color-danger)", margin: "0 0 10px" }}>{error}</p>}

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Employee</th>
              <th>Training</th>
              <th>Status</th>
              <th>Progress</th>
              <th>Attendance</th>
              <th>Score</th>
              <th>Completion Date</th>
              <th>Trainer Remarks</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((a) => (
              <tr key={a.id}>
                <td style={{ fontWeight: 600 }}>{a.employeeName}</td>
                <td>{a.programmeName}</td>
                <td><span className={toneClass(styles, STATUS_TONE[a.status])}>{a.status}</span></td>
                <td>{a.progress}%</td>
                <td>{a.attendance ?? "-"}</td>
                <td>{a.assessmentScore ?? "-"}</td>
                <td className={styles.muted}>{a.completionDate ?? "-"}</td>
                <td className={styles.muted}>{a.trainerRemarks ?? "-"}</td>
                <td>
                  <button type="button" className={styles.actionButton} onClick={() => setEditFor(a)}>
                    <Pencil size={12} strokeWidth={2.25} /> Update
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className={styles.empty}>No trainings match these filters.</div>}
      </div>

      {editFor && (
        <ProgressModal
          assignment={editFor}
          onClose={() => setEditFor(null)}
          onSaved={(a) => {
            setAssignments((prev) => prev.map((x) => (x.id === a.id ? a : x)));
            setEditFor(null);
          }}
        />
      )}
    </div>
  );
}

function ProgressModal({
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
  const [assessmentScore, setAssessmentScore] = useState(assignment.assessmentScore?.toString() ?? "");
  const [feedback, setFeedback] = useState(assignment.feedback ?? "");
  const [trainerRemarks, setTrainerRemarks] = useState(assignment.trainerRemarks ?? "");
  const [completionDate, setCompletionDate] = useState(assignment.completionDate ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/superadmin/training/assignments/${assignment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          progress: progress ? Number(progress) : undefined,
          attendance: attendance || undefined,
          assessmentScore: assessmentScore ? Number(assessmentScore) : undefined,
          feedback,
          trainerRemarks,
          completionDate: completionDate || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not save this update.");
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
      <div className={formStyles.panel} role="dialog" aria-modal="true" aria-label="Update training progress">
        <div className={formStyles.panelHeader}>
          <h2 className={formStyles.title}>{assignment.employeeName} - {assignment.programmeName}</h2>
          <button type="button" className={formStyles.closeButton} onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>
        <form className={formStyles.form} onSubmit={submit}>
          <div className={formStyles.grid}>
            <label className={formStyles.field}>
              <span>Training status</span>
              <select value={status} onChange={(e) => setStatus(e.target.value as TrainingStatus)}>
                {TRAINING_STATUSES.map((s) => (
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
            <label className={formStyles.field}>
              <span>Assessment score</span>
              <input type="number" min="0" value={assessmentScore} onChange={(e) => setAssessmentScore(e.target.value)} placeholder="Marks obtained" />
            </label>
            <label className={formStyles.field}>
              <span>Completion date</span>
              <input type="date" value={completionDate} onChange={(e) => setCompletionDate(e.target.value)} />
            </label>
            <label className={`${formStyles.field} ${formStyles.fieldWide}`}>
              <span>Employee feedback</span>
              <textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} />
            </label>
            <label className={`${formStyles.field} ${formStyles.fieldWide}`}>
              <span>Trainer remarks</span>
              <textarea value={trainerRemarks} onChange={(e) => setTrainerRemarks(e.target.value)} />
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
