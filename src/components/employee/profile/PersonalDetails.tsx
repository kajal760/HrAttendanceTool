"use client";

import { useState } from "react";
import { Pencil, Info } from "lucide-react";
import type { EmployeeOverview } from "@/types/hr";
import { formatDate } from "@/lib/employee/profile-format";
import Fact from "./Fact";
import styles from "./Profile.module.css";

interface EditableFields {
  dateOfBirth: string;
  gender: string;
  maritalStatus: string;
}

function fieldsFrom(employee: EmployeeOverview): EditableFields {
  return {
    dateOfBirth: employee.dateOfBirth ?? "",
    gender: employee.gender ?? "",
    maritalStatus: employee.maritalStatus ?? "",
  };
}

interface PersonalDetailsProps {
  employee: EmployeeOverview;
}

// Self-editable, same save flow as the Contact tab: one PATCH to
// `/api/employee/profile`, which logs a "Profile updated by employee"
// audit entry that HR sees on the Super Admin side - the confirmation box
// after saving is telling the truth, not just UI theater.
export default function PersonalDetails({ employee: initialEmployee }: PersonalDetailsProps) {
  const [employee, setEmployee] = useState(initialEmployee);
  const [editing, setEditing] = useState(false);
  const [fields, setFields] = useState<EditableFields>(() => fieldsFrom(initialEmployee));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAlert, setShowAlert] = useState(false);

  function startEdit() {
    setFields(fieldsFrom(employee));
    setError(null);
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
    setError(null);
  }

  function setField<K extends keyof EditableFields>(key: K, value: string) {
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/employee/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dateOfBirth: fields.dateOfBirth,
          gender: fields.gender,
          maritalStatus: fields.maritalStatus,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Couldn't save your changes.");
      }
      const data = await res.json();
      setEmployee(data.employee);
      setEditing(false);
      if (data.changed) setShowAlert(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save your changes.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {!editing && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
          <button type="button" className={styles.editButton} onClick={startEdit}>
            <Pencil size={13} /> Edit
          </button>
        </div>
      )}

      {editing ? (
        <>
          <p className={styles.sectionNote}>Date of birth, gender, and marital status - editable by you.</p>
          <div className={styles.editFieldGrid}>
            <label className={styles.editField}>
              Date of birth
              <input
                type="date"
                value={fields.dateOfBirth}
                onChange={(e) => setField("dateOfBirth", e.target.value)}
              />
            </label>
            <label className={styles.editField}>
              Gender
              <input value={fields.gender} onChange={(e) => setField("gender", e.target.value)} />
            </label>
            <label className={styles.editField}>
              Marital status
              <input value={fields.maritalStatus} onChange={(e) => setField("maritalStatus", e.target.value)} />
            </label>
          </div>

          {error && (
            <p className={styles.sectionNote} style={{ color: "var(--color-danger)" }}>
              {error}
            </p>
          )}

          <div className={styles.editActions}>
            <button type="button" className={styles.cancelButton} onClick={cancelEdit} disabled={saving}>
              Cancel
            </button>
            <button type="button" className={styles.saveButton} onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save changes"}
            </button>
          </div>
        </>
      ) : (
        <div className={styles.factGrid}>
          <Fact label="Date of birth" value={formatDate(employee.dateOfBirth)} />
          <Fact label="Gender" value={employee.gender ?? "-"} />
          <Fact label="Marital status" value={employee.maritalStatus ?? "-"} />
        </div>
      )}

      {showAlert && (
        <div className={styles.alertOverlay} onClick={() => setShowAlert(false)}>
          <div className={styles.alertBox} onClick={(e) => e.stopPropagation()}>
            <span className={styles.alertIcon}>
              <Info size={20} strokeWidth={1.75} />
            </span>
            <h3 className={styles.alertTitle}>Changes saved</h3>
            <p className={styles.alertText}>
              Your profile has been updated. HR will be notified about the changes you made.
            </p>
            <button type="button" className={styles.alertButton} onClick={() => setShowAlert(false)}>
              OK
            </button>
          </div>
        </div>
      )}
    </>
  );
}
