"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, FileText, Plus, Trash2, Upload } from "lucide-react";
import { DOCUMENT_CATEGORIES } from "@/types/documents";
import type { CompanyDocument, DocumentCategory } from "@/types/documents";
import type { EducationRecord, EmployeeOverview, EmployeeStatus, ExperienceRecord, WorkType } from "@/types/hr";
import { withBase } from "@/lib/portal";
import { usePortalBase } from "./usePortalBase";
import styles from "./EmployeeProfile.module.css";
import AttendanceHistoryView from "./AttendanceHistoryView";
import ConfirmDialog from "./lifecycle/ConfirmDialog";
import LifecycleStageCard from "./LifecycleStageCard";
import type { AttendanceHistory } from "@/types/attendance";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "personal", label: "Personal & Contact" },
  { key: "education", label: "Education & Experience" },
  { key: "employment", label: "Employment & Reporting" },
  { key: "documents", label: "Documents" },
  { key: "attendance", label: "Attendance" },
  { key: "history", label: "History" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

const STATUS_CLASS: Record<EmployeeStatus, string> = {
  Onboarding: "badge-onboarding",
  Probation: "badge-probation",
  Active: "badge-active",
  "On Leave": "badge-onleave",
  "Notice Period": "badge-notice",
  Resigned: "badge-resigned",
  Exited: "badge-exited",
};

const WORK_TYPES: WorkType[] = ["Office", "Hybrid", "WFH"];

function formatDate(iso?: string): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatSalary(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}/yr`;
}

function newId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.round(Math.random() * 1e6)}`;
}

type ActionKey =
  | "transfer"
  | "promote"
  | "change-designation"
  | "change-manager"
  | "initiate-separation"
  | "finalize-separation"
  | "record-fnf";

interface ManagerOption {
  id: string;
  name: string;
}

interface EmployeeProfileProps {
  employee: EmployeeOverview;
  managerOptions: ManagerOption[];
  attendance: AttendanceHistory;
}

export default function EmployeeProfile({ employee: initial, managerOptions, attendance }: EmployeeProfileProps) {
  const base = usePortalBase();
  const [employee, setEmployee] = useState<EmployeeOverview>(initial);
  const [tab, setTab] = useState<TabKey>("overview");
  const [activeAction, setActiveAction] = useState<ActionKey | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");
  const [deleteConfirming, setDeleteConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [actionSubmitting, setActionSubmitting] = useState(false);

  // Action-specific form state (only one action panel is open at a time).
  const [transferDept, setTransferDept] = useState("");
  const [transferLocation, setTransferLocation] = useState("");
  const [transferManagerId, setTransferManagerId] = useState("");
  const [promoteDesignation, setPromoteDesignation] = useState("");
  const [promoteSalary, setPromoteSalary] = useState("");
  const [roleChangeDesignation, setRoleChangeDesignation] = useState("");
  const [managerChangeId, setManagerChangeId] = useState("");
  const [separationReason, setSeparationReason] = useState("");
  const [separationLastDay, setSeparationLastDay] = useState("");
  const [finalizeStatus, setFinalizeStatus] = useState<"Resigned" | "Exited">("Exited");
  const [fnfAmount, setFnfAmount] = useState("");
  const [fnfNotes, setFnfNotes] = useState("");
  const [fnfSettled, setFnfSettled] = useState(false);

  const managerName = managerOptions.find((m) => m.id === employee.managerId)?.name;

  // Deleting doesn't erase the record: it moves to Exited, locks the login,
  // and keeps the history. The Lifecycle module lists it under Separation.
  async function submitDelete() {
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/superadmin/employees/${employee.id}/lifecycle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete-record", reason: deleteReason.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setDeleteError(data.error ?? "Could not delete this record.");
        setDeleteConfirming(false);
        return;
      }
      setEmployee(data.employee);
      setDeleteConfirming(false);
      setDeleteOpen(false);
    } catch {
      setDeleteError("Could not delete this record - check your connection and try again.");
      setDeleteConfirming(false);
    } finally {
      setDeleting(false);
    }
  }

  async function runAction(action: string, fields: Record<string, unknown> = {}) {
    setActionSubmitting(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/superadmin/employees/${employee.id}/lifecycle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...fields }),
      });
      const data = await res.json();
      if (!res.ok) {
        setActionError(data.error ?? "Action failed.");
        return;
      }
      setEmployee(data.employee);
      setActiveAction(null);
    } catch {
      setActionError("Action failed - check your connection and try again.");
    } finally {
      setActionSubmitting(false);
    }
  }

  async function toggleTask(taskId: string) {
    const res = await fetch(`/api/superadmin/employees/${employee.id}/lifecycle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "toggle-onboarding-task", taskId }),
    });
    const data = await res.json();
    if (res.ok) setEmployee(data.employee);
  }

  function openAction(action: ActionKey) {
    setActionError(null);
    setActiveAction((current) => (current === action ? null : action));
  }

  function handleActionSubmit(e: FormEvent) {
    e.preventDefault();
    switch (activeAction) {
      case "transfer":
        runAction("transfer", {
          department: transferDept || undefined,
          location: transferLocation || undefined,
          managerId: transferManagerId === "" ? undefined : transferManagerId || null,
        });
        return;
      case "promote":
        runAction("promote", {
          designation: promoteDesignation,
          salary: promoteSalary ? Number(promoteSalary) : undefined,
        });
        return;
      case "change-designation":
        runAction("change-designation", { designation: roleChangeDesignation });
        return;
      case "change-manager":
        runAction("change-manager", { managerId: managerChangeId || null });
        return;
      case "initiate-separation":
        runAction("initiate-separation", {
          reason: separationReason || undefined,
          lastWorkingDay: separationLastDay || undefined,
        });
        return;
      case "finalize-separation":
        runAction("finalize-separation", { status: finalizeStatus });
        return;
      case "record-fnf":
        runAction("record-fnf", {
          amount: Number(fnfAmount),
          notes: fnfNotes || undefined,
          settled: fnfSettled,
        });
        return;
    }
  }

  const canTransferOrPromote = ["Onboarding", "Probation", "Active", "On Leave"].includes(employee.status);
  const canInitiateSeparation = ["Active", "On Leave", "Probation"].includes(employee.status);

  return (
    <div>
      <Link href={withBase(base, "/employees")} className={styles.backLink}>
        <ArrowLeft size={14} /> All employees
      </Link>

      <div className={styles.header}>
        <span className={styles.avatar}>
          {employee.photoUrl ? (
            <img src={employee.photoUrl} alt="" className={styles.avatarImg} />
          ) : (
            employee.initials
          )}
        </span>
        <div className={styles.headerBody}>
          <div className={styles.nameRow}>
            <h1 className={styles.name}>{employee.name}</h1>
            <span className={`${styles.badge} ${styles[STATUS_CLASS[employee.status]]}`}>
              {employee.status}
            </span>
            {employee.deactivated && <span className={styles.deactivatedBadge}>Deactivated</span>}
          </div>
          <span className={styles.subline}>
            {employee.employeeCode} · {employee.designation} · {employee.department}
            {managerName ? ` · Reports to ${managerName}` : ""}
          </span>
        </div>
        <button
          type="button"
          className={employee.deactivated ? styles.reactivateButton : styles.deactivateButton}
          onClick={() => runAction(employee.deactivated ? "reactivate" : "deactivate")}
          disabled={actionSubmitting}
        >
          {employee.deactivated ? "Reactivate access" : "Deactivate access"}
        </button>
        {employee.exit?.deletedOn ? (
          <span className={styles.deactivatedBadge}>Record deleted</span>
        ) : (
          <button
            type="button"
            className={styles.deactivateButton}
            onClick={() => {
              setDeleteError(null);
              setDeleteOpen(true);
            }}
          >
            Delete employee
          </button>
        )}
      </div>

      {deleteOpen && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(15,18,22,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}
          onMouseDown={(e) => e.target === e.currentTarget && !deleting && setDeleteOpen(false)}
        >
          <div style={{ width: "100%", maxWidth: 420, background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: "20px 22px" }} role="dialog" aria-modal="true" aria-label="Delete employee">
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 6px" }}>Delete {employee.name}?</h3>
            <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: "0 0 12px" }}>
              The record moves to Exited, the login is locked, and the history is kept. It appears under Separation in the Lifecycle module.
            </p>
            <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "var(--color-text-muted)", marginBottom: 14 }}>
              <span>Reason (required)</span>
              <textarea
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                rows={3}
                style={{ fontSize: 13, padding: 8, borderRadius: "var(--radius-sm)", border: "1px solid var(--color-border)", background: "var(--color-bg)", color: "var(--color-text)" }}
              />
            </label>
            {deleteError && <div style={{ fontSize: 12, color: "var(--color-danger)", marginBottom: 10 }}>{deleteError}</div>}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button type="button" className={styles.reactivateButton} style={{ background: "var(--color-surface)", color: "var(--color-text-muted)", border: "1px solid var(--color-border)" }} onClick={() => setDeleteOpen(false)} disabled={deleting}>
                Cancel
              </button>
              <button type="button" className={styles.deactivateButton} onClick={() => setDeleteConfirming(true)} disabled={!deleteReason.trim() || deleting}>
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirming && (
        <ConfirmDialog
          title="Delete employee record"
          message={`Are you sure you want to delete ${employee.name}'s record? ${employee.name} moves to Exited and can no longer sign in.`}
          confirmLabel="Delete record"
          danger
          busy={deleting}
          onConfirm={submitDelete}
          onCancel={() => setDeleteConfirming(false)}
        />
      )}

      <LifecycleStageCard employee={employee} onUpdated={setEmployee} />

      <div className={styles.tabStrip}>
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            className={`${styles.tab} ${tab === t.key ? styles.tabActive : ""}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className={styles.panel}>
          <div className={styles.factGrid}>
            <Fact label="Age" value={String(employee.age)} />
            <Fact label="Salary" value={formatSalary(employee.salary)} />
            <Fact label="Joined" value={formatDate(employee.joinedOn)} />
            <Fact label="Location" value={employee.location ?? "-"} />
            <Fact label="Work type" value={employee.workType ?? "-"} />
            <Fact label="Email" value={employee.email} />
          </div>

          {employee.status === "Onboarding" && employee.onboardingTasks.length > 0 && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Onboarding checklist</h3>
              <ul className={styles.taskList}>
                {employee.onboardingTasks.map((task) => (
                  <li key={task.id} className={styles.taskRow}>
                    <label>
                      <input type="checkbox" checked={task.done} onChange={() => toggleTask(task.id)} />
                      <span className={task.done ? styles.taskDone : ""}>{task.label}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {employee.exit && (employee.status === "Notice Period" || employee.status === "Resigned" || employee.status === "Exited") && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Separation</h3>
              <div className={styles.factGrid}>
                <Fact label="Initiated" value={formatDate(employee.exit.initiatedOn)} />
                <Fact label="Last working day" value={formatDate(employee.exit.lastWorkingDay)} />
                <Fact label="Reason" value={employee.exit.reason ?? "-"} />
                <Fact
                  label="F&F settlement"
                  value={
                    employee.exit.fnfAmount !== undefined
                      ? `${formatSalary(employee.exit.fnfAmount).replace("/yr", "")} · ${employee.exit.fnfSettled ? "Settled" : "Pending"}`
                      : "Not recorded"
                  }
                />
              </div>
            </div>
          )}

          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Lifecycle actions</h3>
            <div className={styles.actionButtons}>
              {employee.status === "Onboarding" && (
                <button type="button" className={styles.actionButton} onClick={() => runAction("complete-onboarding")} disabled={actionSubmitting}>
                  Complete onboarding
                </button>
              )}
              {employee.status === "Probation" && (
                <button type="button" className={styles.actionButton} onClick={() => runAction("confirm")} disabled={actionSubmitting}>
                  Confirm employment
                </button>
              )}
              {canTransferOrPromote && (
                <>
                  <button type="button" className={styles.actionButton} onClick={() => openAction("transfer")}>
                    Transfer
                  </button>
                  <button type="button" className={styles.actionButton} onClick={() => openAction("promote")}>
                    Promote
                  </button>
                  <button type="button" className={styles.actionButton} onClick={() => openAction("change-designation")}>
                    Change designation
                  </button>
                  <button type="button" className={styles.actionButton} onClick={() => openAction("change-manager")}>
                    Change manager
                  </button>
                </>
              )}
              {canInitiateSeparation && (
                <button type="button" className={styles.actionButtonDanger} onClick={() => openAction("initiate-separation")}>
                  Initiate separation
                </button>
              )}
              {employee.status === "Notice Period" && (
                <button type="button" className={styles.actionButtonDanger} onClick={() => openAction("finalize-separation")}>
                  Finalize separation
                </button>
              )}
              {(employee.status === "Resigned" || employee.status === "Exited") && (
                <button type="button" className={styles.actionButton} onClick={() => openAction("record-fnf")}>
                  Record F&amp;F settlement
                </button>
              )}
            </div>

            {activeAction && (
              <form className={styles.actionForm} onSubmit={handleActionSubmit}>
                {activeAction === "transfer" && (
                  <>
                    <input type="text" placeholder="New department (optional)" value={transferDept} onChange={(e) => setTransferDept(e.target.value)} />
                    <input type="text" placeholder="New location (optional)" value={transferLocation} onChange={(e) => setTransferLocation(e.target.value)} />
                    <select value={transferManagerId} onChange={(e) => setTransferManagerId(e.target.value)} aria-label="New manager">
                      <option value="">No manager change</option>
                      {managerOptions.map((m) => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                  </>
                )}
                {activeAction === "promote" && (
                  <>
                    <input type="text" placeholder="New designation" value={promoteDesignation} onChange={(e) => setPromoteDesignation(e.target.value)} required />
                    <input type="number" placeholder="New salary (optional)" min={0} value={promoteSalary} onChange={(e) => setPromoteSalary(e.target.value)} />
                  </>
                )}
                {activeAction === "change-designation" && (
                  <input type="text" placeholder="New designation" value={roleChangeDesignation} onChange={(e) => setRoleChangeDesignation(e.target.value)} required />
                )}
                {activeAction === "change-manager" && (
                  <select value={managerChangeId} onChange={(e) => setManagerChangeId(e.target.value)} aria-label="New manager" required>
                    <option value="">Select a manager</option>
                    {managerOptions.map((m) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                )}
                {activeAction === "initiate-separation" && (
                  <>
                    <input type="text" placeholder="Reason (optional)" value={separationReason} onChange={(e) => setSeparationReason(e.target.value)} />
                    <input type="date" aria-label="Last working day" value={separationLastDay} onChange={(e) => setSeparationLastDay(e.target.value)} />
                  </>
                )}
                {activeAction === "finalize-separation" && (
                  <select value={finalizeStatus} onChange={(e) => setFinalizeStatus(e.target.value as "Resigned" | "Exited")}>
                    <option value="Resigned">Resigned</option>
                    <option value="Exited">Exited</option>
                  </select>
                )}
                {activeAction === "record-fnf" && (
                  <>
                    <input type="number" placeholder="Settlement amount (₹)" min={0} value={fnfAmount} onChange={(e) => setFnfAmount(e.target.value)} required />
                    <input type="text" placeholder="Notes (optional)" value={fnfNotes} onChange={(e) => setFnfNotes(e.target.value)} />
                    <label className={styles.checkboxLabel}>
                      <input type="checkbox" checked={fnfSettled} onChange={(e) => setFnfSettled(e.target.checked)} />
                      Settled
                    </label>
                  </>
                )}
                <div className={styles.actionFormActions}>
                  <button type="submit" className={styles.saveButton} disabled={actionSubmitting}>
                    {actionSubmitting ? "Saving..." : "Submit"}
                  </button>
                  <button type="button" className={styles.cancelButton} onClick={() => setActiveAction(null)}>
                    Cancel
                  </button>
                </div>
              </form>
            )}
            {actionError && <div className={styles.error}>{actionError}</div>}
          </div>
        </div>
      )}

      {tab === "personal" && <PersonalContactPanel employee={employee} onSaved={setEmployee} />}
      {tab === "education" && <EducationExperiencePanel employee={employee} onSaved={setEmployee} />}
      {tab === "employment" && <EmploymentPanel employee={employee} managerName={managerName} onSaved={setEmployee} />}
      {tab === "documents" && <DocumentsPanel employeeId={employee.id} />}
      {tab === "attendance" && <AttendanceHistoryView data={attendance} />}
      {tab === "history" && <HistoryPanel employee={employee} />}
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.fact}>
      <span className={styles.factLabel}>{label}</span>
      <span className={styles.factValue}>{value}</span>
    </div>
  );
}

// --- Personal & Contact ------------------------------------------------

function PersonalContactPanel({
  employee,
  onSaved,
}: {
  employee: EmployeeOverview;
  onSaved: (e: EmployeeOverview) => void;
}) {
  const [phone, setPhone] = useState(employee.phone ?? "");
  const [personalEmail, setPersonalEmail] = useState(employee.personalEmail ?? "");
  const [dateOfBirth, setDateOfBirth] = useState(employee.dateOfBirth ?? "");
  const [gender, setGender] = useState(employee.gender ?? "");
  const [maritalStatus, setMaritalStatus] = useState(employee.maritalStatus ?? "");
  const [currentAddress, setCurrentAddress] = useState(employee.currentAddress ?? "");
  const [permanentAddress, setPermanentAddress] = useState(employee.permanentAddress ?? "");
  const [ecName, setEcName] = useState(employee.emergencyContact?.name ?? "");
  const [ecRelation, setEcRelation] = useState(employee.emergencyContact?.relation ?? "");
  const [ecPhone, setEcPhone] = useState(employee.emergencyContact?.phone ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/superadmin/employees/${employee.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          personalEmail,
          dateOfBirth,
          gender,
          maritalStatus,
          currentAddress,
          permanentAddress,
          emergencyContact: { name: ecName, relation: ecRelation, phone: ecPhone },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not save.");
        return;
      }
      onSaved(data.employee);
    } catch {
      setError("Could not save - check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className={styles.panel} onSubmit={save}>
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Personal details</h3>
        <div className={styles.formGrid}>
          <LabeledInput label="Phone" value={phone} onChange={setPhone} />
          <LabeledInput label="Personal email" value={personalEmail} onChange={setPersonalEmail} type="email" />
          <LabeledInput label="Date of birth" value={dateOfBirth} onChange={setDateOfBirth} type="date" />
          <LabeledInput label="Gender" value={gender} onChange={setGender} />
          <LabeledInput label="Marital status" value={maritalStatus} onChange={setMaritalStatus} />
        </div>
      </div>
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Address</h3>
        <div className={styles.formGrid}>
          <LabeledInput label="Current address" value={currentAddress} onChange={setCurrentAddress} wide />
          <LabeledInput label="Permanent address" value={permanentAddress} onChange={setPermanentAddress} wide />
        </div>
      </div>
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Emergency contact</h3>
        <div className={styles.formGrid}>
          <LabeledInput label="Name" value={ecName} onChange={setEcName} />
          <LabeledInput label="Relation" value={ecRelation} onChange={setEcRelation} />
          <LabeledInput label="Phone" value={ecPhone} onChange={setEcPhone} />
        </div>
      </div>
      <div className={styles.actionFormActions}>
        <button type="submit" className={styles.saveButton} disabled={saving}>
          {saving ? "Saving..." : "Save changes"}
        </button>
      </div>
      {error && <div className={styles.error}>{error}</div>}
    </form>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
  type = "text",
  wide = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  wide?: boolean;
}) {
  return (
    <label className={`${styles.field} ${wide ? styles.fieldWide : ""}`}>
      <span className={styles.fieldLabel}>{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

// --- Education & Experience ---------------------------------------------

function EducationExperiencePanel({
  employee,
  onSaved,
}: {
  employee: EmployeeOverview;
  onSaved: (e: EmployeeOverview) => void;
}) {
  const [education, setEducation] = useState<EducationRecord[]>(employee.education);
  const [experience, setExperience] = useState<ExperienceRecord[]>(employee.experience);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/superadmin/employees/${employee.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ education, experience }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not save.");
        return;
      }
      onSaved(data.employee);
    } catch {
      setError("Could not save - check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.panel}>
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>Education</h3>
          <button
            type="button"
            className={styles.addRowButton}
            onClick={() => setEducation((prev) => [...prev, { id: newId("edu"), degree: "", institution: "", year: "" }])}
          >
            <Plus size={13} /> Add
          </button>
        </div>
        {education.map((rec, i) => (
          <div key={rec.id} className={styles.recordRow}>
            <input
              type="text"
              placeholder="Degree"
              value={rec.degree}
              onChange={(e) => setEducation((prev) => prev.map((r, j) => (j === i ? { ...r, degree: e.target.value } : r)))}
            />
            <input
              type="text"
              placeholder="Institution"
              value={rec.institution}
              onChange={(e) => setEducation((prev) => prev.map((r, j) => (j === i ? { ...r, institution: e.target.value } : r)))}
            />
            <input
              type="text"
              placeholder="Year"
              value={rec.year}
              onChange={(e) => setEducation((prev) => prev.map((r, j) => (j === i ? { ...r, year: e.target.value } : r)))}
            />
            <button type="button" className={styles.removeRowButton} onClick={() => setEducation((prev) => prev.filter((_, j) => j !== i))} aria-label="Remove">
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        {education.length === 0 && <div className={styles.emptyHint}>No education records yet.</div>}
      </div>

      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>Experience</h3>
          <button
            type="button"
            className={styles.addRowButton}
            onClick={() => setExperience((prev) => [...prev, { id: newId("exp"), company: "", role: "", durationYears: 0 }])}
          >
            <Plus size={13} /> Add
          </button>
        </div>
        {experience.map((rec, i) => (
          <div key={rec.id} className={styles.recordRow}>
            <input
              type="text"
              placeholder="Company"
              value={rec.company}
              onChange={(e) => setExperience((prev) => prev.map((r, j) => (j === i ? { ...r, company: e.target.value } : r)))}
            />
            <input
              type="text"
              placeholder="Role"
              value={rec.role}
              onChange={(e) => setExperience((prev) => prev.map((r, j) => (j === i ? { ...r, role: e.target.value } : r)))}
            />
            <input
              type="number"
              placeholder="Years"
              min={0}
              value={rec.durationYears || ""}
              onChange={(e) =>
                setExperience((prev) => prev.map((r, j) => (j === i ? { ...r, durationYears: Number(e.target.value) } : r)))
              }
            />
            <button type="button" className={styles.removeRowButton} onClick={() => setExperience((prev) => prev.filter((_, j) => j !== i))} aria-label="Remove">
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        {experience.length === 0 && <div className={styles.emptyHint}>No experience records yet.</div>}
      </div>

      <div className={styles.actionFormActions}>
        <button type="button" className={styles.saveButton} onClick={save} disabled={saving}>
          {saving ? "Saving..." : "Save changes"}
        </button>
      </div>
      {error && <div className={styles.error}>{error}</div>}
    </div>
  );
}

// --- Employment & Reporting ----------------------------------------------

function EmploymentPanel({
  employee,
  managerName,
  onSaved,
}: {
  employee: EmployeeOverview;
  managerName?: string;
  onSaved: (e: EmployeeOverview) => void;
}) {
  const [workType, setWorkType] = useState<WorkType | "">(employee.workType ?? "");
  const [skillsText, setSkillsText] = useState(employee.skills.join(", "));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function saveWorkType() {
    setSaving(true);
    setError(null);
    try {
      const skills = skillsText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const res = await fetch(`/api/superadmin/employees/${employee.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workType, skills }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not save.");
        return;
      }
      onSaved(data.employee);
    } catch {
      setError("Could not save - check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.panel}>
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Employment</h3>
        <div className={styles.factGrid}>
          <Fact label="Department" value={employee.department} />
          <Fact label="Designation" value={employee.designation} />
          <Fact label="Manager" value={managerName ?? "Unassigned"} />
          <Fact label="Location" value={employee.location ?? "-"} />
          <Fact label="Joined" value={formatDate(employee.joinedOn)} />
          <Fact label="Salary" value={formatSalary(employee.salary)} />
        </div>
        <p className={styles.emptyHint}>
          Department, designation, manager, and location change via the lifecycle actions on the
          Overview tab so they're recorded in History.
        </p>
      </div>
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Work type &amp; skills</h3>
        <div className={styles.formGrid}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Work type</span>
            <select value={workType} onChange={(e) => setWorkType(e.target.value as WorkType)}>
              <option value="">Not set</option>
              {WORK_TYPES.map((w) => (
                <option key={w} value={w}>{w}</option>
              ))}
            </select>
          </label>
          <label className={`${styles.field} ${styles.fieldWide}`}>
            <span className={styles.fieldLabel}>Skills (comma-separated)</span>
            <input type="text" value={skillsText} onChange={(e) => setSkillsText(e.target.value)} />
          </label>
        </div>
        <div className={styles.actionFormActions}>
          <button type="button" className={styles.saveButton} onClick={saveWorkType} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
        {error && <div className={styles.error}>{error}</div>}
      </div>
    </div>
  );
}

// --- Documents -------------------------------------------------------------

function DocumentsPanel({ employeeId }: { employeeId: string }) {
  const [documents, setDocuments] = useState<CompanyDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<DocumentCategory>("Onboarding");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/superadmin/employees/${employeeId}/documents`)
      .then((r) => r.json())
      .then((data) => setDocuments(data.documents ?? []))
      .finally(() => setLoading(false));
  }, [employeeId]);

  async function upload(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!file) {
      setError("Choose a PDF to upload.");
      return;
    }
    if (!title.trim()) {
      setError("Give the document a title.");
      return;
    }
    const form = new FormData();
    form.set("title", title.trim());
    form.set("category", category);
    form.set("file", file);
    form.set("employeeId", employeeId);

    setUploading(true);
    try {
      const res = await fetch("/api/superadmin/documents", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Upload failed.");
        return;
      }
      setDocuments((prev) => [data.document, ...prev]);
      setTitle("");
      setFile(null);
    } catch {
      setError("Upload failed - check your connection and try again.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className={styles.panel}>
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Documents</h3>
        <form className={styles.uploadForm} onSubmit={upload}>
          <input type="text" placeholder="Title, e.g. ID proof" value={title} onChange={(e) => setTitle(e.target.value)} />
          <select value={category} onChange={(e) => setCategory(e.target.value as DocumentCategory)}>
            {DOCUMENT_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <input type="file" accept="application/pdf,.pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          <button type="submit" className={styles.saveButton} disabled={uploading}>
            <Upload size={13} /> {uploading ? "Uploading..." : "Upload"}
          </button>
        </form>
        {error && <div className={styles.error}>{error}</div>}

        {loading ? (
          <div className={styles.emptyHint}>Loading...</div>
        ) : documents.length === 0 ? (
          <div className={styles.emptyHint}>No documents uploaded for this employee yet.</div>
        ) : (
          <ul className={styles.docList}>
            {documents.map((doc) => (
              <li key={doc.id} className={styles.docRow}>
                <FileText size={16} />
                <div className={styles.docBody}>
                  <span className={styles.docTitle}>{doc.title}</span>
                  <span className={styles.docMeta}>{doc.category} · {formatDate(doc.uploadedAt)}</span>
                </div>
                <a href={doc.fileUrl} target="_blank" rel="noreferrer" className={styles.docLink}>View</a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// --- History -----------------------------------------------------------

function HistoryPanel({ employee }: { employee: EmployeeOverview }) {
  return (
    <div className={styles.panel}>
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Lifecycle history</h3>
        {employee.lifecycleHistory.length === 0 ? (
          <div className={styles.emptyHint}>No history yet.</div>
        ) : (
          <ul className={styles.historyList}>
            {employee.lifecycleHistory.map((event) => (
              <li key={event.id} className={styles.historyRow}>
                <span className={styles.historyDate}>{formatDateTime(event.date)}</span>
                <span className={styles.historyType}>{event.type}</span>
                {event.detail && <span className={styles.historyDetail}>{event.detail}</span>}
                <span className={styles.historyBy}>{event.performedBy}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
