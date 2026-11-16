"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { Bell, Plus, X } from "lucide-react";
import type { EmployeeOverview } from "@/types/hr";
import { toneClass } from "./badge-tones";
import formStyles from "../FormModal.module.css";
import styles from "./Lifecycle.module.css";
import { useDepartmentNames } from "../useDepartmentNames";

type OnboardingDisplayStatus = "Joining" | "Pending Verification" | "Not Started" | "In Progress" | "Completed";

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

// A scheduled hire (registered now, joining later - see `submitStartOnboarding`
// below) is kept deactivated (no portal access) from the moment they're
// created. Once their joining date arrives, they sit here - access still
// held - until HR verifies them in the popup below and grants it.
function needsAccessVerification(e: EmployeeOverview): boolean {
  return e.deactivated && e.joinedOn <= todayKey();
}

function onboardingDisplayStatus(e: EmployeeOverview): OnboardingDisplayStatus {
  const today = todayKey();
  if (e.joinedOn > today) return "Joining";
  if (e.deactivated) return "Pending Verification";
  const total = e.onboardingTasks.length;
  const done = e.onboardingTasks.filter((t) => t.done).length;
  if (done === 0) return "Not Started";
  if (done === total) return "Completed";
  return "In Progress";
}

const DISPLAY_TONE: Record<OnboardingDisplayStatus, "gray" | "amber" | "blue" | "green" | "red"> = {
  Joining: "gray",
  "Pending Verification": "red",
  "Not Started": "amber",
  "In Progress": "blue",
  Completed: "green",
};

function formatDate(iso?: string): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("en-GB", { month: "short", day: "numeric", year: "numeric" });
}

const DRAFT_KEY = "hr-lifecycle-onboarding-draft";

interface StartOnboardingForm {
  employeeCode: string;
  name: string;
  joinedOn: string;
  department: string;
  designation: string;
  managerId: string;
  location: string;
  employmentType: string;
  probationPeriodMonths: string;
}

const EMPTY_FORM: StartOnboardingForm = {
  employeeCode: "",
  name: "",
  joinedOn: "",
  department: "",
  designation: "",
  managerId: "",
  location: "",
  employmentType: "Full-time",
  probationPeriodMonths: "3",
};

function loadDraft(): StartOnboardingForm {
  if (typeof window === "undefined") return EMPTY_FORM;
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    return raw ? { ...EMPTY_FORM, ...JSON.parse(raw) } : EMPTY_FORM;
  } catch {
    return EMPTY_FORM;
  }
}

interface ManagerOption {
  id: string;
  name: string;
}

interface OnboardingTabProps {
  employees: EmployeeOverview[];
  managerOptions: ManagerOption[];
  onEmployeeAdded: (employee: EmployeeOverview) => void;
  onEmployeeUpdated: (employee: EmployeeOverview) => void;
  onViewLifecycle: (id: string) => void;
}

export default function OnboardingTab({
  employees,
  managerOptions,
  onEmployeeAdded,
  onEmployeeUpdated,
  onViewLifecycle,
}: OnboardingTabProps) {
  const { activeNames } = useDepartmentNames();
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<StartOnboardingForm>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checklistFor, setChecklistFor] = useState<EmployeeOverview | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  // Auto-open once on load if anyone's already waiting on verification - the
  // "HR gets notified" half of the scheduled-joining feature. Lazy initial
  // state so it only pops up on arrival, not on every re-render afterwards;
  // HR can still reopen it via the bell button once dismissed.
  const [verifyPanelOpen, setVerifyPanelOpen] = useState(() => employees.some(needsAccessVerification));

  const onboarding = employees.filter((e) => e.status === "Onboarding");
  const pendingVerification = onboarding.filter(needsAccessVerification);

  function openForm() {
    setForm(loadDraft());
    setError(null);
    setFormOpen(true);
  }

  function saveDraft() {
    try {
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
    } catch {
      // best-effort - localStorage can be unavailable (private mode, quota)
    }
    setFormOpen(false);
  }

  async function submitStartOnboarding(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.name.trim() || !form.joinedOn || !form.department.trim() || !form.designation.trim()) {
      setError("Employee ID, employee, joining date, department, and designation are required.");
      return;
    }
    setSubmitting(true);
    try {
      const slug = form.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/^\.+|\.+$/g, "") || "employee";
      const res = await fetch("/api/superadmin/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeCode: form.employeeCode.trim(),
          name: form.name.trim(),
          email: `${slug}.${Date.now()}@pending.hrattendance.example`,
          department: form.department.trim(),
          designation: form.designation.trim(),
          joinedOn: form.joinedOn,
          age: 25,
          salary: 0,
          managerId: form.managerId || undefined,
          location: form.location.trim() || undefined,
          employmentType: form.employmentType || undefined,
          probationPeriodMonths: form.probationPeriodMonths ? Number(form.probationPeriodMonths) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not start onboarding.");
        return;
      }
      let newEmployee: EmployeeOverview = data.employee;
      // Registered now, joining later: hold their access until the actual
      // joining day, when HR has to verify and grant it explicitly (the
      // popup below) rather than it being live from the day of registration.
      if (form.joinedOn > todayKey()) {
        const lockRes = await fetch(`/api/superadmin/employees/${newEmployee.id}/lifecycle`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "deactivate" }),
        });
        const lockData = await lockRes.json();
        if (lockRes.ok) newEmployee = lockData.employee;
      }
      onEmployeeAdded(newEmployee);
      try {
        window.localStorage.removeItem(DRAFT_KEY);
      } catch {
        // ignore
      }
      setFormOpen(false);
    } catch {
      setError("Could not start onboarding - check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function verifyAndGrantAccess(employee: EmployeeOverview) {
    setBusyId(employee.id);
    try {
      const res = await fetch(`/api/superadmin/employees/${employee.id}/lifecycle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reactivate" }),
      });
      const data = await res.json();
      if (res.ok) onEmployeeUpdated(data.employee);
    } finally {
      setBusyId(null);
    }
  }

  async function toggleTask(employee: EmployeeOverview, taskId: string) {
    setBusyId(employee.id);
    try {
      const res = await fetch(`/api/superadmin/employees/${employee.id}/lifecycle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle-onboarding-task", taskId }),
      });
      const data = await res.json();
      if (res.ok) {
        onEmployeeUpdated(data.employee);
        setChecklistFor(data.employee);
      }
    } finally {
      setBusyId(null);
    }
  }

  async function completeOnboarding(employee: EmployeeOverview) {
    setBusyId(employee.id);
    try {
      const res = await fetch(`/api/superadmin/employees/${employee.id}/lifecycle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "complete-onboarding" }),
      });
      const data = await res.json();
      if (res.ok) {
        onEmployeeUpdated(data.employee);
        setChecklistFor(null);
      }
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className={styles.sectionHeader}>
        {pendingVerification.length > 0 ? (
          <button
            type="button"
            className={toneClass(styles, "red")}
            style={{ border: "none", cursor: "pointer" }}
            onClick={() => setVerifyPanelOpen(true)}
          >
            <Bell size={12} strokeWidth={2.25} style={{ verticalAlign: "middle", marginRight: 4 }} />
            {pendingVerification.length} joiner{pendingVerification.length === 1 ? "" : "s"} need access verification
          </button>
        ) : (
          <span />
        )}
        <button type="button" className={styles.primaryButton} onClick={openForm}>
          <Plus size={14} strokeWidth={2.25} /> Start Onboarding
        </button>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Employee</th>
              <th>Joining Date</th>
              <th>Department</th>
              <th>Designation</th>
              <th>Reporting Manager</th>
              <th>Onboarding Progress</th>
              <th>Pending Items</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {onboarding.map((e) => {
              const total = e.onboardingTasks.length;
              const done = e.onboardingTasks.filter((t) => t.done).length;
              const pct = total > 0 ? Math.round((done / total) * 100) : 0;
              const display = onboardingDisplayStatus(e);
              const managerName = managerOptions.find((m) => m.id === e.managerId)?.name;
              return (
                <tr key={e.id}>
                  <td>
                    <span style={{ fontWeight: 600 }}>{e.name}</span>
                  </td>
                  <td>{formatDate(e.joinedOn)}</td>
                  <td>{e.department}</td>
                  <td>{e.designation}</td>
                  <td>{managerName ?? "-"}</td>
                  <td style={{ minWidth: 120 }}>
                    <div className={styles.progressTrack}>
                      <div className={styles.progressFill} style={{ width: `${pct}%` }} />
                    </div>
                    <span className={styles.muted}>{pct}%</span>
                  </td>
                  <td>{total - done}</td>
                  <td>
                    <span className={toneClass(styles, DISPLAY_TONE[display])}>{display}</span>
                  </td>
                  <td style={{ display: "flex", gap: 6 }}>
                    <button type="button" className={styles.actionButton} onClick={() => setChecklistFor(e)}>
                      Checklist
                    </button>
                    <button type="button" className={styles.actionButton} onClick={() => onViewLifecycle(e.id)}>
                      View
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {onboarding.length === 0 && <div className={styles.empty}>No one is currently joining or onboarding.</div>}
      </div>

      {formOpen && (
        <div className={formStyles.overlay} onMouseDown={(e) => e.target === e.currentTarget && setFormOpen(false)}>
          <div className={formStyles.panel} role="dialog" aria-modal="true" aria-label="Start Onboarding">
            <div className={formStyles.panelHeader}>
              <h2 className={formStyles.title}>Start Onboarding</h2>
              <button type="button" className={formStyles.closeButton} onClick={() => setFormOpen(false)} aria-label="Close">
                <X size={16} />
              </button>
            </div>
            <form className={formStyles.form} onSubmit={submitStartOnboarding}>
              <div className={formStyles.grid}>
                <label className={formStyles.field}>
                  <span>Employee ID</span>
                  <input type="text" value={form.employeeCode} onChange={(e) => setForm((f) => ({ ...f, employeeCode: e.target.value }))} placeholder="e.g. HR-2041" />
                </label>
                <label className={formStyles.field}>
                  <span>Employee</span>
                  <input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
                </label>
                <label className={formStyles.field}>
                  <span>Joining Date</span>
                  <input type="date" value={form.joinedOn} onChange={(e) => setForm((f) => ({ ...f, joinedOn: e.target.value }))} />
                </label>
                <label className={formStyles.field}>
                  <span>Department</span>
                  <select value={form.department} onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}>
                    <option value="">Select department</option>
                    {(form.department && !activeNames.includes(form.department) ? [form.department, ...activeNames] : activeNames).map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </label>
                <label className={formStyles.field}>
                  <span>Designation</span>
                  <input type="text" value={form.designation} onChange={(e) => setForm((f) => ({ ...f, designation: e.target.value }))} />
                </label>
                <label className={formStyles.field}>
                  <span>Reporting Manager</span>
                  <select value={form.managerId} onChange={(e) => setForm((f) => ({ ...f, managerId: e.target.value }))}>
                    <option value="">Department head (default)</option>
                    {managerOptions.map((m) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </label>
                <label className={formStyles.field}>
                  <span>Location</span>
                  <input type="text" value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} />
                </label>
                <label className={formStyles.field}>
                  <span>Employment Type</span>
                  <select value={form.employmentType} onChange={(e) => setForm((f) => ({ ...f, employmentType: e.target.value }))}>
                    <option value="Full-time">Full-time</option>
                    <option value="Contract">Contract</option>
                    <option value="Intern">Intern</option>
                    <option value="Part-time">Part-time</option>
                  </select>
                </label>
                <label className={formStyles.field}>
                  <span>Probation Period (months)</span>
                  <input
                    type="number"
                    min={0}
                    max={24}
                    value={form.probationPeriodMonths}
                    onChange={(e) => setForm((f) => ({ ...f, probationPeriodMonths: e.target.value }))}
                  />
                </label>
              </div>

              <div className={formStyles.checklistSection}>
                <span className={formStyles.checklistTitle}>Onboarding checklist (created automatically)</span>
                <p className={styles.hint}>
                  Employee profile completed · Documents submitted · Company policies accepted · Email/account created ·
                  Laptop/device assigned · Access card assigned · Department assigned · Reporting manager assigned ·
                  Initial project/task assigned
                </p>
              </div>

              {error && <div className={formStyles.error}>{error}</div>}

              <div className={formStyles.actions}>
                <button type="button" className={formStyles.cancelButton} onClick={saveDraft}>
                  Save Draft
                </button>
                <button type="button" className={formStyles.cancelButton} onClick={() => setFormOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className={formStyles.saveButton} disabled={submitting}>
                  {submitting ? "Starting..." : "Start Onboarding"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {checklistFor && (
        <div className={formStyles.overlay} onMouseDown={(e) => e.target === e.currentTarget && setChecklistFor(null)}>
          <div className={formStyles.panel} role="dialog" aria-modal="true" aria-label="Onboarding checklist">
            <div className={formStyles.panelHeader}>
              <h2 className={formStyles.title}>{checklistFor.name} - Onboarding Checklist</h2>
              <button type="button" className={formStyles.closeButton} onClick={() => setChecklistFor(null)} aria-label="Close">
                <X size={16} />
              </button>
            </div>
            {checklistFor.onboardingTasks.map((t) => (
              <div key={t.id} className={styles.checklistRow}>
                <span className={styles.checklistLabel}>{t.label}</span>
                <button
                  type="button"
                  className={toneClass(styles, t.done ? "green" : "amber")}
                  style={{ border: "none", cursor: "pointer" }}
                  onClick={() => toggleTask(checklistFor, t.id)}
                  disabled={busyId === checklistFor.id}
                >
                  {t.done ? "Completed" : "Pending"}
                </button>
              </div>
            ))}
            <div className={formStyles.actions}>
              <button type="button" className={formStyles.cancelButton} onClick={() => setChecklistFor(null)}>
                Close
              </button>
              {checklistFor.onboardingTasks.every((t) => t.done) && (
                <button
                  type="button"
                  className={formStyles.saveButton}
                  onClick={() => completeOnboarding(checklistFor)}
                  disabled={busyId === checklistFor.id}
                >
                  Mark Onboarding Completed
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {verifyPanelOpen && pendingVerification.length > 0 && (
        <div className={formStyles.overlay} onMouseDown={(e) => e.target === e.currentTarget && setVerifyPanelOpen(false)}>
          <div className={formStyles.panel} role="dialog" aria-modal="true" aria-label="Verify new joiners">
            <div className={formStyles.panelHeader}>
              <h2 className={formStyles.title}>Verify new joiners</h2>
              <button type="button" className={formStyles.closeButton} onClick={() => setVerifyPanelOpen(false)} aria-label="Close">
                <X size={16} />
              </button>
            </div>
            <p className={styles.hint}>
              Their joining date has arrived, but portal access is still held. Confirm each one actually joined
              before granting access.
            </p>
            {pendingVerification.map((e) => {
              const managerName = managerOptions.find((m) => m.id === e.managerId)?.name;
              return (
                <div key={e.id} className={styles.checklistRow}>
                  <span className={styles.checklistLabel}>
                    {e.name} - {e.designation}, {e.department}
                    <br />
                    <span className={styles.muted}>
                      Joined {formatDate(e.joinedOn)}
                      {managerName ? ` · Reports to ${managerName}` : ""}
                    </span>
                  </span>
                  <button
                    type="button"
                    className={formStyles.saveButton}
                    onClick={() => verifyAndGrantAccess(e)}
                    disabled={busyId === e.id}
                  >
                    {busyId === e.id ? "Granting..." : "Verify & Grant Access"}
                  </button>
                </div>
              );
            })}
            <div className={formStyles.actions}>
              <button type="button" className={formStyles.cancelButton} onClick={() => setVerifyPanelOpen(false)}>
                Review later
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
