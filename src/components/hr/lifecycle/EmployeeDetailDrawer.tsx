"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import type { EmployeeOverview, ExitChecklistItemStatus } from "@/types/hr";
import type { CompanyDocument } from "@/types/documents";
import { EMPLOYEE_STATUS_TONE, toneClass } from "./badge-tones";
import styles from "./Lifecycle.module.css";

type DrawerTab = "overview" | "timeline" | "onboarding" | "employment" | "separation" | "documents" | "assets" | "activity";

const TABS: { key: DrawerTab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "timeline", label: "Timeline" },
  { key: "onboarding", label: "Onboarding" },
  { key: "employment", label: "Employment Changes" },
  { key: "separation", label: "Separation" },
  { key: "documents", label: "Documents" },
  { key: "assets", label: "Assets" },
  { key: "activity", label: "Activity" },
];

function formatDate(iso?: string): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("en-GB", { month: "short", day: "numeric", year: "numeric" });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

const EMPLOYMENT_CHANGE_TYPES = new Set(["Confirmed", "Confirmation updated", "Transferred", "Promoted", "Role changed"]);
const ITEM_STATUSES: ExitChecklistItemStatus[] = ["Pending", "In Progress", "Completed"];

interface ManagerOption {
  id: string;
  name: string;
}

interface EmployeeDetailDrawerProps {
  employee: EmployeeOverview;
  managerOptions: ManagerOption[];
  onClose: () => void;
  onEmployeeUpdated: (employee: EmployeeOverview) => void;
}

// The "View Lifecycle" panel - occupies ~90% of the screen per spec. All of
// Overview/Timeline/Onboarding/Employment Changes/Separation/Activity read
// straight off the `employee` prop (already the full record), so opening
// this needs no extra fetch; only Documents hits its own endpoint.
export default function EmployeeDetailDrawer({ employee, managerOptions, onClose, onEmployeeUpdated }: EmployeeDetailDrawerProps) {
  const [tab, setTab] = useState<DrawerTab>("overview");
  const [documents, setDocuments] = useState<CompanyDocument[] | null>(null);
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (tab !== "documents" || documents !== null) return;
    fetch(`/api/superadmin/employees/${employee.id}/documents`)
      .then((r) => r.json())
      .then((data) => setDocuments(data.documents ?? []))
      .catch(() => setDocuments([]));
  }, [tab, documents, employee.id]);

  const managerName = managerOptions.find((m) => m.id === employee.managerId)?.name;

  async function toggleOnboardingTask(taskId: string) {
    setBusyTaskId(taskId);
    try {
      const res = await fetch(`/api/superadmin/employees/${employee.id}/lifecycle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle-onboarding-task", taskId }),
      });
      const data = await res.json();
      if (res.ok) onEmployeeUpdated(data.employee);
    } finally {
      setBusyTaskId(null);
    }
  }

  async function updateExitItem(itemId: string, status: ExitChecklistItemStatus) {
    setBusyTaskId(itemId);
    try {
      const res = await fetch(`/api/superadmin/employees/${employee.id}/lifecycle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update-exit-checklist", itemId, status }),
      });
      const data = await res.json();
      if (res.ok) onEmployeeUpdated(data.employee);
    } finally {
      setBusyTaskId(null);
    }
  }

  const employmentChanges = employee.lifecycleHistory.filter((ev) => EMPLOYMENT_CHANGE_TYPES.has(ev.type));

  return (
    <div className={styles.drawerOverlay} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.drawerPanel} role="dialog" aria-modal="true" aria-label={`${employee.name} lifecycle`}>
        <div className={styles.drawerHeader}>
          <span className={styles.drawerAvatar}>
            {employee.photoUrl ? <img src={employee.photoUrl} alt="" className={styles.drawerAvatarImg} /> : employee.initials}
          </span>
          <div className={styles.drawerHeaderBody}>
            <h2 className={styles.drawerName}>{employee.name}</h2>
            <span className={styles.drawerSubline}>
              {employee.employeeCode} · {employee.department} · {employee.designation} ·{" "}
              <span className={toneClass(styles, EMPLOYEE_STATUS_TONE[employee.status])}>{employee.status}</span>
            </span>
          </div>
          <button type="button" className={styles.drawerCloseButton} onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className={styles.drawerTabStrip}>
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

        <div className={styles.drawerBody}>
          {tab === "overview" && (
            <div className={styles.factGrid}>
              <div className={styles.fact}><span className={styles.factLabel}>Email</span><span className={styles.factValue}>{employee.email}</span></div>
              <div className={styles.fact}><span className={styles.factLabel}>Phone</span><span className={styles.factValue}>{employee.phone ?? "-"}</span></div>
              <div className={styles.fact}><span className={styles.factLabel}>Joining Date</span><span className={styles.factValue}>{formatDate(employee.joinedOn)}</span></div>
              <div className={styles.fact}><span className={styles.factLabel}>Employment Type</span><span className={styles.factValue}>{employee.employmentType ?? "-"}</span></div>
              <div className={styles.fact}><span className={styles.factLabel}>Reporting Manager</span><span className={styles.factValue}>{managerName ?? "-"}</span></div>
              <div className={styles.fact}><span className={styles.factLabel}>Location</span><span className={styles.factValue}>{employee.location ?? "-"}</span></div>
              <div className={styles.fact}><span className={styles.factLabel}>Grade</span><span className={styles.factValue}>{employee.grade ?? "-"}</span></div>
              <div className={styles.fact}><span className={styles.factLabel}>Salary</span><span className={styles.factValue}>₹{employee.salary.toLocaleString("en-IN")}/yr</span></div>
              <div className={styles.fact}><span className={styles.factLabel}>Probation Start</span><span className={styles.factValue}>{formatDate(employee.probationStartDate)}</span></div>
              <div className={styles.fact}><span className={styles.factLabel}>Probation End</span><span className={styles.factValue}>{formatDate(employee.probationEndDate)}</span></div>
              <div className={styles.fact}><span className={styles.factLabel}>Confirmation Status</span><span className={styles.factValue}>{employee.confirmationStatus ?? "-"}</span></div>
              <div className={styles.fact}><span className={styles.factLabel}>Confirmation Date</span><span className={styles.factValue}>{formatDate(employee.confirmationDate)}</span></div>
            </div>
          )}

          {tab === "timeline" && (
            <div className={styles.vTimeline}>
              {employee.lifecycleHistory.length === 0 && <div className={styles.empty}>No lifecycle events yet.</div>}
              {[...employee.lifecycleHistory]
                .sort((a, b) => (a.date < b.date ? -1 : 1))
                .map((ev, i, arr) => (
                  <div key={ev.id} className={styles.vTimelineItem}>
                    <div className={styles.vTimelineRail}>
                      <div className={styles.vTimelineDot} />
                      {i < arr.length - 1 && <div className={styles.vTimelineLine} />}
                    </div>
                    <div className={styles.vTimelineBody}>
                      <div className={styles.vTimelineDate}>{formatDateTime(ev.date)}</div>
                      <div className={styles.vTimelineEvent}>{ev.type}</div>
                      {(ev.previousValue || ev.newValue) && (
                        <div className={styles.vTimelineDetail}>
                          {ev.previousValue ?? "-"} → {ev.newValue ?? "-"}
                        </div>
                      )}
                      {ev.detail && <div className={styles.vTimelineDetail}>{ev.detail}</div>}
                      <div className={styles.vTimelineMeta}>Changed by {ev.performedBy}</div>
                    </div>
                  </div>
                ))}
            </div>
          )}

          {tab === "onboarding" && (
            <div>
              {employee.onboardingTasks.length === 0 && <div className={styles.empty}>No onboarding checklist on this record.</div>}
              {employee.onboardingTasks.map((t) => (
                <div key={t.id} className={styles.checklistRow}>
                  <span className={styles.checklistLabel}>{t.label}</span>
                  <button
                    type="button"
                    className={toneClass(styles, t.done ? "green" : "amber")}
                    style={{ border: "none", cursor: "pointer" }}
                    disabled={busyTaskId === t.id}
                    onClick={() => toggleOnboardingTask(t.id)}
                  >
                    {t.done ? "Completed" : "Pending"}
                  </button>
                </div>
              ))}
            </div>
          )}

          {tab === "employment" && (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Change</th>
                    <th>Previous</th>
                    <th>New</th>
                    <th>Performed By</th>
                  </tr>
                </thead>
                <tbody>
                  {employmentChanges.map((ev) => (
                    <tr key={ev.id}>
                      <td>{formatDate(ev.date)}</td>
                      <td>{ev.type}</td>
                      <td className={styles.muted}>{ev.previousValue ?? "-"}</td>
                      <td>{ev.newValue ?? "-"}</td>
                      <td>{ev.performedBy}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {employmentChanges.length === 0 && <div className={styles.empty}>No employment changes recorded.</div>}
            </div>
          )}

          {tab === "separation" && (
            <div>
              {!employee.exit ? (
                <div className={styles.empty}>Not currently in separation.</div>
              ) : (
                <>
                  <div className={styles.factGrid} style={{ marginBottom: 16 }}>
                    <div className={styles.fact}><span className={styles.factLabel}>Resignation Date</span><span className={styles.factValue}>{formatDate(employee.exit.resignationDate)}</span></div>
                    <div className={styles.fact}><span className={styles.factLabel}>Last Working Day</span><span className={styles.factValue}>{formatDate(employee.exit.lastWorkingDay)}</span></div>
                    <div className={styles.fact}><span className={styles.factLabel}>Notice Period</span><span className={styles.factValue}>{employee.exit.noticePeriodDays ? `${employee.exit.noticePeriodDays} days` : "-"}</span></div>
                    <div className={styles.fact}><span className={styles.factLabel}>Reason</span><span className={styles.factValue}>{employee.exit.reason ?? "-"}</span></div>
                    <div className={styles.fact}><span className={styles.factLabel}>F&amp;F Settled</span><span className={styles.factValue}>{employee.exit.fnfSettled ? "Yes" : "No"}</span></div>
                  </div>
                  {(employee.exit.checklist ?? []).map((item) => (
                    <div key={item.id} className={styles.checklistRow}>
                      <span className={styles.checklistLabel}>{item.category} · {item.label}</span>
                      <select
                        className={styles.checklistSelect}
                        value={item.status}
                        disabled={busyTaskId === item.id}
                        onChange={(e) => updateExitItem(item.id, e.target.value as ExitChecklistItemStatus)}
                      >
                        {ITEM_STATUSES.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}

          {tab === "documents" && (
            <div>
              {documents === null && <div className={styles.empty}>Loading documents...</div>}
              {documents?.length === 0 && <div className={styles.empty}>No documents on file for this employee.</div>}
              {documents && documents.length > 0 && (
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Title</th>
                        <th>Category</th>
                        <th>Uploaded</th>
                      </tr>
                    </thead>
                    <tbody>
                      {documents.map((d) => (
                        <tr key={d.id}>
                          <td>{d.title}</td>
                          <td>{d.category}</td>
                          <td>{formatDate(d.uploadedAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {tab === "assets" && (
            <div className={styles.empty}>
              Assets aren&apos;t tracked per employee yet - see the company asset catalog from the employee&apos;s own
              Assets page. Laptop/ID card/access card return is tracked via the Separation checklist above.
            </div>
          )}

          {tab === "activity" && (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Date &amp; Time</th>
                    <th>Action</th>
                    <th>Previous Value</th>
                    <th>New Value</th>
                    <th>Performed By</th>
                  </tr>
                </thead>
                <tbody>
                  {[...employee.lifecycleHistory]
                    .sort((a, b) => (a.date < b.date ? 1 : -1))
                    .map((ev) => (
                      <tr key={ev.id}>
                        <td>{formatDateTime(ev.date)}</td>
                        <td>{ev.type}{ev.detail ? ` - ${ev.detail}` : ""}</td>
                        <td className={styles.muted}>{ev.previousValue ?? "-"}</td>
                        <td>{ev.newValue ?? "-"}</td>
                        <td>{ev.performedBy}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
