"use client";

import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { Plus, X } from "lucide-react";
import type { EmployeeOverview, EmployeeStatus, ExitChecklistCategory, ExitChecklistItemStatus } from "@/types/hr";
import { withBase } from "@/lib/portal";
import { usePortalBase } from "../usePortalBase";
import { toneClass } from "./badge-tones";
import ConfirmDialog from "./ConfirmDialog";
import formStyles from "../FormModal.module.css";
import styles from "./Lifecycle.module.css";

const EXIT_STATUSES: EmployeeStatus[] = ["Notice Period", "Resigned", "Exited"];
const ITEM_STATUSES: ExitChecklistItemStatus[] = ["Pending", "In Progress", "Completed"];
const CATEGORIES: ExitChecklistCategory[] = ["Handover", "Assets", "Access", "HR"];

function formatDate(iso?: string): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("en-GB", { month: "short", day: "numeric", year: "numeric" });
}

// A richer display status than the stored EmployeeStatus/exit fields alone -
// walks the checklist + F&F flag to say exactly where this exit stands.
function exitDisplayStatus(e: EmployeeOverview): { label: string; tone: "red" | "amber" | "blue" | "green" } {
  if (e.exit?.deletedOn) return { label: "Deleted record", tone: "red" };
  if (e.status === "Notice Period") {
    const checklist = e.exit?.checklist ?? [];
    const handoverDone = checklist.filter((c) => c.category === "Handover").every((c) => c.status === "Completed");
    if (checklist.length > 0 && !handoverDone) return { label: "Handover", tone: "amber" };
    const clearanceDone = checklist
      .filter((c) => c.category === "Assets" || c.category === "Access")
      .every((c) => c.status === "Completed");
    if (checklist.length > 0 && !clearanceDone) return { label: "Clearance Pending", tone: "amber" };
    return { label: "Notice Period", tone: "blue" };
  }
  if (e.status === "Resigned" || e.status === "Exited") {
    if (!e.exit?.fnfSettled) return { label: "Full & Final Pending", tone: "amber" };
    return { label: "Completed", tone: "green" };
  }
  return { label: "Resignation Submitted", tone: "red" };
}

function checklistProgress(e: EmployeeOverview): number {
  const checklist = e.exit?.checklist ?? [];
  if (checklist.length === 0) return 0;
  const done = checklist.filter((c) => c.status === "Completed").length;
  return Math.round((done / checklist.length) * 100);
}

interface EmployeeOption {
  id: string;
  name: string;
}

interface StartExitForm {
  employeeId: string;
  resignationDate: string;
  lastWorkingDay: string;
  reason: string;
  noticePeriodDays: string;
  remarks: string;
}

const EMPTY_FORM: StartExitForm = {
  employeeId: "",
  resignationDate: new Date().toISOString().slice(0, 10),
  lastWorkingDay: "",
  reason: "",
  noticePeriodDays: "30",
  remarks: "",
};

interface SeparationTabProps {
  employees: EmployeeOverview[];
  onEmployeeUpdated: (employee: EmployeeOverview) => void;
  onViewLifecycle: (id: string) => void;
}

export default function SeparationTab({ employees, onEmployeeUpdated, onViewLifecycle }: SeparationTabProps) {
  const base = usePortalBase();
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<StartExitForm>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checklistFor, setChecklistFor] = useState<EmployeeOverview | null>(null);
  const [busyItemId, setBusyItemId] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);
  const [finalizeStatus, setFinalizeStatus] = useState<"Resigned" | "Exited">("Exited");

  const exiting = useMemo(() => employees.filter((e) => EXIT_STATUSES.includes(e.status)), [employees]);
  const eligibleForExit: EmployeeOption[] = useMemo(
    () => employees.filter((e) => ["Active", "On Leave", "Probation"].includes(e.status)).map((e) => ({ id: e.id, name: e.name })),
    [employees],
  );

  const summary = {
    resignations: exiting.length,
    noticePeriod: employees.filter((e) => e.status === "Notice Period").length,
    handoverPending: exiting.filter((e) => exitDisplayStatus(e).label === "Handover").length,
    clearancePending: exiting.filter((e) => exitDisplayStatus(e).label === "Clearance Pending").length,
    fnfPending: exiting.filter((e) => exitDisplayStatus(e).label === "Full & Final Pending").length,
    completedExits: exiting.filter((e) => exitDisplayStatus(e).label === "Completed").length,
  };

  function openForm() {
    setForm(EMPTY_FORM);
    setError(null);
    setFormOpen(true);
  }

  async function submitStartExit(e: FormEvent) {
    e.preventDefault();
    if (!form.employeeId) {
      setError("Select an employee.");
      return;
    }
    if (!form.lastWorkingDay) {
      setError("Last working day is required.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/superadmin/employees/${form.employeeId}/lifecycle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "initiate-separation",
          resignationDate: form.resignationDate || undefined,
          lastWorkingDay: form.lastWorkingDay,
          reason: form.reason.trim() || undefined,
          noticePeriodDays: form.noticePeriodDays ? Number(form.noticePeriodDays) : undefined,
          remarks: form.remarks.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not start the exit process.");
        return;
      }
      onEmployeeUpdated(data.employee);
      setFormOpen(false);
      setChecklistFor(data.employee);
    } catch {
      setError("Could not start the exit process - check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function updateChecklistItem(employee: EmployeeOverview, itemId: string, status: ExitChecklistItemStatus) {
    setBusyItemId(itemId);
    try {
      const res = await fetch(`/api/superadmin/employees/${employee.id}/lifecycle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update-exit-checklist", itemId, status }),
      });
      const data = await res.json();
      if (res.ok) {
        onEmployeeUpdated(data.employee);
        setChecklistFor(data.employee);
      }
    } finally {
      setBusyItemId(null);
    }
  }

  async function refreshChecklist(employee: EmployeeOverview) {
    const res = await fetch(`/api/superadmin/employees/${employee.id}`);
    const data = await res.json();
    if (res.ok) {
      onEmployeeUpdated(data.employee);
      setChecklistFor(data.employee);
    }
  }

  async function submitCompleteExit() {
    if (!checklistFor) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/superadmin/employees/${checklistFor.id}/lifecycle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "finalize-separation", status: finalizeStatus }),
      });
      const data = await res.json();
      if (res.ok) {
        onEmployeeUpdated(data.employee);
        setChecklistFor(data.employee);
      }
    } finally {
      setSubmitting(false);
      setCompleting(false);
    }
  }

  const progress = checklistFor ? checklistProgress(checklistFor) : 0;

  return (
    <div>
      <div className={styles.statGrid}>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{summary.resignations}</span>
          <span className={styles.statLabel}>Resignations</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{summary.noticePeriod}</span>
          <span className={styles.statLabel}>Notice Period</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{summary.handoverPending}</span>
          <span className={styles.statLabel}>Handover Pending</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{summary.clearancePending}</span>
          <span className={styles.statLabel}>Asset Clearance Pending</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{summary.fnfPending}</span>
          <span className={styles.statLabel}>Full & Final Pending</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{summary.completedExits}</span>
          <span className={styles.statLabel}>Completed Exits</span>
        </div>
      </div>

      <div className={styles.sectionHeader}>
        <span />
        <button type="button" className={styles.primaryButton} onClick={openForm}>
          <Plus size={14} strokeWidth={2.25} /> Start Exit
        </button>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Employee</th>
              <th>Resignation Date</th>
              <th>Last Working Day</th>
              <th>Notice Status</th>
              <th>Exit Progress</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {exiting.map((e) => {
              const display = exitDisplayStatus(e);
              const pct = checklistProgress(e);
              return (
                <tr key={e.id}>
                  <td style={{ fontWeight: 600 }}>{e.name}</td>
                  <td>{formatDate(e.exit?.resignationDate)}</td>
                  <td>{formatDate(e.exit?.lastWorkingDay)}</td>
                  <td>{e.status}</td>
                  <td style={{ minWidth: 120 }}>
                    <div className={styles.progressTrack}>
                      <div className={styles.progressFill} style={{ width: `${pct}%` }} />
                    </div>
                    <span className={styles.muted}>{pct}%</span>
                  </td>
                  <td>
                    <span className={toneClass(styles, display.tone)}>{display.label}</span>
                  </td>
                  <td style={{ display: "flex", gap: 6 }}>
                    <button type="button" className={styles.actionButton} onClick={() => setChecklistFor(e)}>
                      Manage Exit
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
        {exiting.length === 0 && <div className={styles.empty}>No one is currently separating.</div>}
      </div>

      {formOpen && (
        <div className={formStyles.overlay} onMouseDown={(e) => e.target === e.currentTarget && setFormOpen(false)}>
          <div className={formStyles.panel} role="dialog" aria-modal="true" aria-label="Employee Exit Process">
            <div className={formStyles.panelHeader}>
              <h2 className={formStyles.title}>Employee Exit Process</h2>
              <button type="button" className={formStyles.closeButton} onClick={() => setFormOpen(false)} aria-label="Close">
                <X size={16} />
              </button>
            </div>
            <form className={formStyles.form} onSubmit={submitStartExit}>
              <div className={formStyles.grid}>
                <label className={formStyles.field}>
                  <span>Employee</span>
                  <select value={form.employeeId} onChange={(e) => setForm((f) => ({ ...f, employeeId: e.target.value }))}>
                    <option value="">Select employee</option>
                    {eligibleForExit.map((e) => (
                      <option key={e.id} value={e.id}>{e.name}</option>
                    ))}
                  </select>
                </label>
                <label className={formStyles.field}>
                  <span>Resignation Date</span>
                  <input type="date" value={form.resignationDate} onChange={(e) => setForm((f) => ({ ...f, resignationDate: e.target.value }))} />
                </label>
                <label className={formStyles.field}>
                  <span>Last Working Day</span>
                  <input type="date" value={form.lastWorkingDay} onChange={(e) => setForm((f) => ({ ...f, lastWorkingDay: e.target.value }))} />
                </label>
                <label className={formStyles.field}>
                  <span>Notice Period (days)</span>
                  <input type="number" min={0} value={form.noticePeriodDays} onChange={(e) => setForm((f) => ({ ...f, noticePeriodDays: e.target.value }))} />
                </label>
                <label className={`${formStyles.field} ${formStyles.fieldWide}`}>
                  <span>Reason for Leaving</span>
                  <input type="text" value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} />
                </label>
                <label className={`${formStyles.field} ${formStyles.fieldWide}`}>
                  <span>Remarks</span>
                  <textarea value={form.remarks} onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))} />
                </label>
              </div>

              <p className={styles.hint}>
                Starting the exit process creates a checklist across Handover, Assets, Access, and HR - manage it from
                the &quot;Manage Exit&quot; action once this is submitted.
              </p>

              {error && <div className={formStyles.error}>{error}</div>}

              <div className={formStyles.actions}>
                <button type="button" className={formStyles.cancelButton} onClick={() => setFormOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className={formStyles.saveButton} disabled={submitting}>
                  {submitting ? "Starting..." : "Start Exit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {checklistFor && (
        <div className={formStyles.overlay} onMouseDown={(e) => e.target === e.currentTarget && setChecklistFor(null)}>
          <div className={formStyles.panel} role="dialog" aria-modal="true" aria-label="Exit checklist" style={{ maxWidth: 560 }}>
            <div className={formStyles.panelHeader}>
              <h2 className={formStyles.title}>{checklistFor.name} - Exit Checklist</h2>
              <button type="button" className={formStyles.closeButton} onClick={() => setChecklistFor(null)} aria-label="Close">
                <X size={16} />
              </button>
            </div>

            <div style={{ marginBottom: 10 }}>
              <div className={styles.progressTrack}>
                <div className={styles.progressFill} style={{ width: `${progress}%` }} />
              </div>
              <span className={styles.muted}>Exit Progress: {progress}%</span>
            </div>

            {CATEGORIES.map((cat) => {
              const items = (checklistFor.exit?.checklist ?? []).filter((c) => c.category === cat);
              if (items.length === 0) return null;
              return (
                <div key={cat} className={styles.checklistGroup}>
                  <p className={styles.checklistGroupTitle}>{cat}</p>
                  {items.map((item) => (
                    <div key={item.id} className={styles.checklistRow}>
                      <span className={styles.checklistLabel}>{item.label}</span>
                      <select
                        className={styles.checklistSelect}
                        value={item.status}
                        disabled={busyItemId === item.id}
                        onChange={(e) => updateChecklistItem(checklistFor, item.id, e.target.value as ExitChecklistItemStatus)}
                      >
                        {ITEM_STATUSES.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              );
            })}

            {checklistFor.status === "Resigned" || checklistFor.status === "Exited" ? (
              <p className={styles.hint}>
                F&amp;F settlement: {checklistFor.exit?.fnfSettled ? "Settled" : "Pending"} - record it from{" "}
                <Link href={withBase(base, "/lifecycle/fnf")}>Full &amp; Final</Link>.
              </p>
            ) : null}

            {checklistFor.status === "Notice Period" && (
              <label className={formStyles.field} style={{ marginBottom: 12 }}>
                <span>Final Status (for Complete Exit)</span>
                <select value={finalizeStatus} onChange={(e) => setFinalizeStatus(e.target.value as "Resigned" | "Exited")}>
                  <option value="Resigned">Resigned</option>
                  <option value="Exited">Exited</option>
                </select>
              </label>
            )}
            {checklistFor.status === "Notice Period" && progress < 100 && (
              <p className={styles.hint} style={{ color: "var(--color-warning)" }}>
                Exit checklist is only {progress}% complete. You can still complete the exit, but consider finishing
                handover/clearance first.
              </p>
            )}

            <div className={formStyles.actions}>
              <button type="button" className={formStyles.cancelButton} onClick={() => setChecklistFor(null)}>
                Save Exit
              </button>
              <button type="button" className={formStyles.cancelButton} onClick={() => refreshChecklist(checklistFor)}>
                Update Progress
              </button>
              {checklistFor.status === "Notice Period" && (
                <button type="button" className={formStyles.saveButton} onClick={() => setCompleting(true)}>
                  Complete Exit
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {completing && checklistFor && (
        <ConfirmDialog
          title="Complete Exit"
          message={`Are you sure you want to mark ${checklistFor.name}'s exit as complete (status: ${finalizeStatus})? This cannot be undone from here.`}
          confirmLabel="Complete Exit"
          danger
          busy={submitting}
          onConfirm={submitCompleteExit}
          onCancel={() => setCompleting(false)}
        />
      )}
    </div>
  );
}
