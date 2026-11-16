"use client";

import { useState } from "react";
import type { WorkTask } from "@/types/work";
import styles from "./lifecycle/Lifecycle.module.css";

interface TodaysTasksListProps {
  tasks: (WorkTask & { projectName: string })[];
}

// Tasks due today, across every project - checking one off marks it
// Completed via the same PATCH the Kanban board and table use.
export default function TodaysTasksList({ tasks: initial }: TodaysTasksListProps) {
  const [tasks, setTasks] = useState(initial);
  const [savingId, setSavingId] = useState<string | null>(null);

  async function toggle(task: WorkTask) {
    const nextStatus = task.status === "Completed" ? "Pending" : "Completed";
    setSavingId(task.id);
    try {
      const res = await fetch(`/api/superadmin/work/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();
      if (res.ok) {
        setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: data.task.status } : t)));
      }
    } finally {
      setSavingId(null);
    }
  }

  if (tasks.length === 0) {
    return <p style={{ fontSize: 13, color: "var(--color-text-muted)" }}>Nothing due today.</p>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {tasks.map((t) => (
        <label key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={t.status === "Completed"}
            disabled={savingId === t.id}
            onChange={() => toggle(t)}
          />
          <span style={{ flex: 1, textDecoration: t.status === "Completed" ? "line-through" : "none", color: t.status === "Completed" ? "var(--color-text-muted)" : "var(--color-text)" }}>
            {t.title}
          </span>
          <span className={styles.muted} style={{ fontSize: 11 }}>{t.projectName}</span>
        </label>
      ))}
    </div>
  );
}
