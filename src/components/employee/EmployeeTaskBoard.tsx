"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { RequestRecipient } from "@/types/employee";
import type { WorkTaskDisplayStatus, WorkTaskWithProject } from "@/types/work";
import { STATUS_FILTERS, displayStatus, progressFor } from "@/lib/work/status";
import MentionRecipientPicker from "./MentionRecipientPicker";
import styles from "./EmployeeTaskBoard.module.css";

const BADGE_CLASS: Record<WorkTaskDisplayStatus, string> = {
  Pending: "badge-pending",
  Ongoing: "badge-ongoing",
  Completed: "badge-completed",
  Overdue: "badge-overdue",
};

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

interface EmployeeTaskBoardProps {
  tasks: WorkTaskWithProject[];
  employeeId: string;
  mentionOptions: RequestRecipient[];
}

// The employee side of Work & Project Management: every field a manager set
// (title, project, deadline, status, assignees, dependency) is read-only
// here - the only things an assignee can write are `summary` and
// `mentionedIds`, saved together through the dedicated employee-only
// endpoint.
export default function EmployeeTaskBoard({ tasks: initialTasks, employeeId, mentionOptions }: EmployeeTaskBoardProps) {
  const [tasks, setTasks] = useState<WorkTaskWithProject[]>(initialTasks);
  const [filter, setFilter] = useState<WorkTaskDisplayStatus | "All">("All");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [draftSummary, setDraftSummary] = useState<Record<string, string>>({});
  const [draftMentions, setDraftMentions] = useState<Record<string, RequestRecipient[]>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  const mentionOptionsById = useMemo(() => new Map(mentionOptions.map((o) => [o.id, o])), [mentionOptions]);

  const counts = useMemo(() => {
    const c: Record<WorkTaskDisplayStatus, number> = { Pending: 0, Ongoing: 0, Completed: 0, Overdue: 0 };
    for (const task of tasks) c[displayStatus(task)] += 1;
    return c;
  }, [tasks]);

  const filtered = useMemo(() => {
    if (filter === "All") return tasks;
    return tasks.filter((t) => displayStatus(t) === filter);
  }, [tasks, filter]);

  function startEditing(task: WorkTaskWithProject) {
    setDraftSummary((prev) => ({ ...prev, [task.id]: task.summary ?? "" }));
    setDraftMentions((prev) => ({
      ...prev,
      [task.id]: (task.mentionedIds ?? []).map((id) => mentionOptionsById.get(id)).filter((r): r is RequestRecipient => !!r),
    }));
    setEditingId(task.id);
  }

  async function saveSummary(task: WorkTaskWithProject) {
    const summary = draftSummary[task.id]?.trim() ?? "";
    const mentionedIds = (draftMentions[task.id] ?? []).map((r) => r.id);
    setSaving(task.id);
    try {
      const res = await fetch(`/api/employee/tasks/${task.id}/summary`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId, summary, mentionedIds }),
      });
      const data = await res.json();
      if (res.ok) {
        setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, ...data.task } : t)));
        setEditingId(null);
      }
    } finally {
      setSaving(null);
    }
  }

  return (
    <div>
      <div className={styles.filterRow}>
        <button
          type="button"
          className={`${styles.filterButton} ${filter === "All" ? styles.filterButtonActive : ""}`}
          onClick={() => setFilter("All")}
        >
          All ({tasks.length})
        </button>
        {STATUS_FILTERS.map((status) => (
          <button
            key={status}
            type="button"
            className={`${styles.filterButton} ${filter === status ? styles.filterButtonActive : ""}`}
            onClick={() => setFilter(status)}
          >
            {status} ({counts[status]})
          </button>
        ))}
      </div>

      <div className={styles.list}>
        {filtered.length === 0 && <p className={styles.empty}>No tasks in this view.</p>}
        {filtered.map((task) => {
          const status = displayStatus(task);
          const isExpanded = expandedId === task.id;
          const isEditing = editingId === task.id;

          return (
            <div className={styles.card} key={task.id}>
              <div className={styles.cardTop} onClick={() => setExpandedId(isExpanded ? null : task.id)}>
                <div className={styles.titleBlock}>
                  <span className={styles.title}>{task.title}</span>
                  <span className={styles.project}>{task.projectName}</span>
                </div>
                <span className={`${styles.deadline} ${status === "Overdue" ? styles.deadlineOverdue : ""}`}>
                  Due {formatDate(task.deadline)}
                </span>
                <span className={`${styles.badge} ${styles[BADGE_CLASS[status]]}`}>{status}</span>
                <ChevronDown size={14} className={`${styles.chevron} ${isExpanded ? styles.chevronOpen : ""}`} />
              </div>

              {isExpanded && (
                <div className={styles.details}>
                  {task.description && <p className={styles.description}>{task.description}</p>}
                  <div className={styles.track}>
                    <div className={styles.fill} style={{ width: `${progressFor(task)}%` }} />
                  </div>

                  {task.dependsOnTask && (
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Dependency</span>
                      <p className={styles.blockedBy}>
                        Blocked by: {task.dependsOnTask.title} ({task.dependsOnTask.status})
                      </p>
                    </div>
                  )}

                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Your summary</span>
                    {isEditing ? (
                      <div>
                        <textarea
                          className={styles.summaryTextarea}
                          value={draftSummary[task.id] ?? ""}
                          onChange={(e) =>
                            setDraftSummary((prev) => ({ ...prev, [task.id]: e.target.value }))
                          }
                          placeholder="Write a short update for this task..."
                          autoFocus
                        />
                        <div className={styles.mentionField}>
                          <MentionRecipientPicker
                            options={mentionOptions}
                            value={draftMentions[task.id] ?? []}
                            onChange={(next) => setDraftMentions((prev) => ({ ...prev, [task.id]: next }))}
                          />
                        </div>
                        <div className={styles.summaryActions}>
                          <button
                            type="button"
                            className={styles.buttonPrimary}
                            disabled={saving === task.id}
                            onClick={() => saveSummary(task)}
                          >
                            {saving === task.id ? "Saving..." : "Save summary"}
                          </button>
                          <button type="button" className={styles.buttonGhost} onClick={() => setEditingId(null)}>
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <p className={styles.summaryText}>
                          {task.summary?.trim() ? task.summary : <span className={styles.muted}>No summary written yet.</span>}
                        </p>
                        {task.mentionedIds && task.mentionedIds.length > 0 && (
                          <div className={styles.mentionChips}>
                            {task.mentionedIds.map((id) => {
                              const person = mentionOptionsById.get(id);
                              return (
                                <span className={styles.mentionChip} key={id}>
                                  @{person?.label ?? id}
                                </span>
                              );
                            })}
                          </div>
                        )}
                        <button type="button" className={styles.editLink} onClick={() => startEditing(task)}>
                          {task.summary?.trim() ? "Edit summary" : "Write summary"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
