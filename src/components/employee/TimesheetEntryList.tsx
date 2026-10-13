"use client";

import { useEffect, useState } from "react";
import type { TimesheetEntry } from "@/types/timesheet";
import Pager from "./Pager";
import styles from "./TimesheetEntryList.module.css";

const PAGE_SIZE = 10;

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

interface TimesheetEntryListProps {
  myEmployeeId: string;
  employeeNames: Record<string, string>;
  taskTitles: Record<string, string>;
  refreshKey: number;
}

// "Mine" is editable; "My department" is everyone in the same department,
// read-only - an employee can see their team's logged work but not edit it.
export default function TimesheetEntryList({ myEmployeeId, employeeNames, taskTitles, refreshKey }: TimesheetEntryListProps) {
  const [scope, setScope] = useState<"mine" | "department">("mine");
  const [entries, setEntries] = useState<TimesheetEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftHours, setDraftHours] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/employee/timesheets?scope=${scope}`)
      .then((r) => r.json())
      .then((data) => setEntries(data.entries ?? []))
      .finally(() => setLoading(false));
  }, [scope, refreshKey]);

  const sorted = [...entries].sort((a, b) => (a.date < b.date ? 1 : -1));
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageEntries = sorted.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  function changeScope(next: "mine" | "department") {
    setScope(next);
    setPage(0);
  }

  function startEdit(entry: TimesheetEntry) {
    setEditingId(entry.id);
    setDraftHours(String(entry.hours));
    setDraftDescription(entry.description);
    setError(null);
  }

  async function saveEdit(id: string) {
    const hours = Number(draftHours);
    if (Number.isNaN(hours) || hours < 0.25 || hours > 24) {
      setError("Enter hours between 0.25 and 24.");
      return;
    }
    const res = await fetch(`/api/employee/timesheets/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hours, description: draftDescription.trim() }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Could not save.");
      return;
    }
    setEntries((prev) => prev.map((e) => (e.id === id ? data.entry : e)));
    setEditingId(null);
  }

  async function removeEntry(id: string) {
    const res = await fetch(`/api/employee/timesheets/${id}`, { method: "DELETE" });
    if (res.ok) setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  return (
    <div>
      <div className={styles.scopeSwitch}>
        <button
          type="button"
          className={`${styles.scopeButton} ${scope === "mine" ? styles.scopeButtonActive : ""}`}
          onClick={() => changeScope("mine")}
        >
          Mine
        </button>
        <button
          type="button"
          className={`${styles.scopeButton} ${scope === "department" ? styles.scopeButtonActive : ""}`}
          onClick={() => changeScope("department")}
        >
          My department
        </button>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      {loading ? (
        <p className={styles.empty}>Loading...</p>
      ) : pageEntries.length === 0 ? (
        <p className={styles.empty}>No timesheet entries in this view.</p>
      ) : (
        <div className={styles.list}>
          {pageEntries.map((entry) => {
            const isMine = entry.employeeId === myEmployeeId;
            const isEditing = editingId === entry.id;
            return (
              <div className={styles.row} key={entry.id}>
                <div className={styles.rowHeader}>
                  <span className={styles.date}>{formatDate(entry.date)}</span>
                  {scope === "department" && (
                    <span className={styles.who}>{employeeNames[entry.employeeId] ?? entry.employeeId}</span>
                  )}
                  {entry.taskId && <span className={styles.taskChip}>{taskTitles[entry.taskId] ?? "Task"}</span>}
                </div>

                {isEditing ? (
                  <div className={styles.editRow}>
                    <input
                      type="number"
                      step="0.25"
                      min="0.25"
                      max="24"
                      value={draftHours}
                      onChange={(e) => setDraftHours(e.target.value)}
                      className={styles.editHours}
                    />
                    <textarea
                      value={draftDescription}
                      onChange={(e) => setDraftDescription(e.target.value)}
                      className={styles.editDescription}
                    />
                    <div className={styles.editActions}>
                      <button type="button" className={styles.saveButton} onClick={() => saveEdit(entry.id)}>
                        Save
                      </button>
                      <button type="button" className={styles.cancelButton} onClick={() => setEditingId(null)}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className={styles.rowBody}>
                    <span className={styles.hours}>{entry.hours}h</span>
                    <p className={styles.description}>{entry.description}</p>
                    {isMine && (
                      <div className={styles.rowActions}>
                        <button type="button" className={styles.linkButton} onClick={() => startEdit(entry)}>
                          Edit
                        </button>
                        <button type="button" className={styles.linkButtonDanger} onClick={() => removeEntry(entry.id)}>
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Pager page={page} totalPages={totalPages} onChange={setPage} />
    </div>
  );
}
