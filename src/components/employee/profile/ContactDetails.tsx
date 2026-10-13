"use client";

import { useState } from "react";
import { Pencil, Info } from "lucide-react";
import type { EmployeeOverview } from "@/types/hr";
import Fact from "./Fact";
import styles from "./Profile.module.css";

interface EditableFields {
  phone: string;
  personalEmail: string;
  currentAddress: string;
  permanentAddress: string;
  emergencyName: string;
  emergencyRelation: string;
  emergencyPhone: string;
}

function fieldsFrom(employee: EmployeeOverview): EditableFields {
  return {
    phone: employee.phone ?? "",
    personalEmail: employee.personalEmail ?? "",
    currentAddress: employee.currentAddress ?? "",
    permanentAddress: employee.permanentAddress ?? "",
    emergencyName: employee.emergencyContact?.name ?? "",
    emergencyRelation: employee.emergencyContact?.relation ?? "",
    emergencyPhone: employee.emergencyContact?.phone ?? "",
  };
}

interface ContactDetailsProps {
  employee: EmployeeOverview;
}

// The only self-editable part of the profile - phone, personal email, both
// addresses, and emergency contact, all saved together via one
// `PATCH /api/employee/profile` call (moved here unchanged from the old
// single-page `MyProfile`, which spread these same fields across two
// cards). Saving writes a real "Profile updated by employee" lifecycle/
// audit entry on this record, which is what feeds the Super Admin's
// Activity Log - the alert after saving is telling the truth, not just UI
// theater.
export default function ContactDetails({ employee: initialEmployee }: ContactDetailsProps) {
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
          phone: fields.phone,
          personalEmail: fields.personalEmail,
          currentAddress: fields.currentAddress,
          permanentAddress: fields.permanentAddress,
          emergencyContact: {
            name: fields.emergencyName,
            relation: fields.emergencyRelation,
            phone: fields.emergencyPhone,
          },
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
          <p className={styles.sectionNote}>Phone, email, addresses, and emergency contact - editable by you.</p>
          <div className={styles.editFieldGrid}>
            <label className={styles.editField}>
              Phone
              <input value={fields.phone} onChange={(e) => setField("phone", e.target.value)} />
            </label>
            <label className={styles.editField}>
              Personal email
              <input
                type="email"
                value={fields.personalEmail}
                onChange={(e) => setField("personalEmail", e.target.value)}
              />
            </label>
            <label className={styles.editField}>
              Current address
              <input value={fields.currentAddress} onChange={(e) => setField("currentAddress", e.target.value)} />
            </label>
            <label className={styles.editField}>
              Permanent address
              <input value={fields.permanentAddress} onChange={(e) => setField("permanentAddress", e.target.value)} />
            </label>
            <label className={styles.editField}>
              Emergency contact name
              <input value={fields.emergencyName} onChange={(e) => setField("emergencyName", e.target.value)} />
            </label>
            <label className={styles.editField}>
              Relation
              <input value={fields.emergencyRelation} onChange={(e) => setField("emergencyRelation", e.target.value)} />
            </label>
            <label className={styles.editField}>
              Emergency phone
              <input value={fields.emergencyPhone} onChange={(e) => setField("emergencyPhone", e.target.value)} />
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
          <Fact label="Phone" value={employee.phone ?? "-"} />
          <Fact label="Personal email" value={employee.personalEmail ?? "-"} />
          <Fact label="Current address" value={employee.currentAddress ?? "-"} />
          <Fact label="Permanent address" value={employee.permanentAddress ?? "-"} />
          <Fact label="Emergency contact" value={employee.emergencyContact?.name ?? "-"} />
          <Fact
            label="Relation / phone"
            value={
              employee.emergencyContact
                ? `${employee.emergencyContact.relation || "-"} · ${employee.emergencyContact.phone || "-"}`
                : "-"
            }
          />
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
