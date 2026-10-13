"use client";

import { useState, type FormEvent } from "react";
import type { WorkTask } from "@/types/work";
import styles from "./TimesheetEntryForm.module.css";

function todayKey(): string {
  return new Date().toLocaleDateString("en-CA");
}

interface TimesheetEntryFormProps {
  myTasks: WorkTask[];
  onSaved: () => void;
}

export default function TimesheetEntryForm({ myTasks, onSaved }: TimesheetEntryFormProps) {
  const [date, setDate] = useState(todayKey());
  const [hours, setHours] = useState("8");
  const [taskId, setTaskId] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const hoursNum = Number(hours);
    if (Number.isNaN(hoursNum) || hoursNum < 0.25 || hoursNum > 24) {
      setError("Enter hours between 0.25 and 24.");
      return;
    }
    if (description.trim().length < 5) {
      setError("Add a short description (5+ characters).");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/employee/timesheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, hours: hoursNum, description: description.trim(), taskId: taskId || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not save this entry.");
        return;
      }
      setHours("8");
      setTaskId("");
      setDescription("");
      onSaved();
    } catch {
      setError("Could not save - check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.formRow}>
        <label className={styles.field}>
          Date
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} max={todayKey()} required />
        </label>
        <label className={styles.field}>
          Hours
          <input
            type="number"
            step="0.25"
            min="0.25"
            max="24"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            required
          />
        </label>
        <label className={styles.field}>
          Task (optional)
          <select value={taskId} onChange={(e) => setTaskId(e.target.value)}>
            <option value="">Not linked to a task</option>
            {myTasks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className={styles.field}>
        What did you work on?
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Short description of today's work..."
          required
        />
      </label>
      {error && <span className={styles.error}>{error}</span>}
      <div className={styles.formActions}>
        <button type="submit" className={styles.submitButton} disabled={submitting}>
          {submitting ? "Saving..." : "Log time"}
        </button>
      </div>
    </form>
  );
}
