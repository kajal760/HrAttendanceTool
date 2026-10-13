"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Pencil, UserMinus, UserPlus, X } from "lucide-react";
import type { Department, EmployeeOverview } from "@/types/hr";
import type { Project, ProjectRollupStatus } from "@/types/work";
import type { SystemLogEntry } from "@/types/log";
import { withBase } from "@/lib/portal";
import { usePortalBase } from "./usePortalBase";
import DepartmentFormModal from "./DepartmentFormModal";
import SystemLogViewer from "./SystemLogViewer";
import formStyles from "./FormModal.module.css";
import styles from "./DepartmentDetailView.module.css";

type Tab = "overview" | "projects" | "activity";

const PROJECT_STATUS_CLASS: Record<ProjectRollupStatus, string> = {
  Active: "projStatusActive",
  Completed: "projStatusCompleted",
  Upcoming: "projStatusUpcoming",
  Delayed: "projStatusDelayed",
};

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((sum, v) => sum + v, 0) / values.length);
}

function formatDate(iso?: string): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

interface DepartmentDetailViewProps {
  department: Department;
  members: EmployeeOverview[];
  otherEmployees: EmployeeOverview[];
  projects: (Project & { status: ProjectRollupStatus })[];
  logs: SystemLogEntry[];
}

// Full department view: roster (with add/remove), project rollup, and
// filtered activity log - the "Department 360" the Employees grid's rollup
// table only teases via a link into a pre-filtered Employees list.
export default function DepartmentDetailView({
  department: initialDepartment,
  members: initialMembers,
  otherEmployees,
  projects,
  logs,
}: DepartmentDetailViewProps) {
  const base = usePortalBase();
  const [department, setDepartment] = useState(initialDepartment);
  const [members, setMembers] = useState(initialMembers);
  const [candidates, setCandidates] = useState(otherEmployees);
  const [tab, setTab] = useState<Tab>("overview");
  const [editOpen, setEditOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [sourceDeptFilter, setSourceDeptFilter] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [addBusy, setAddBusy] = useState(false);
  const [archiveBusy, setArchiveBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const headName = members.find((m) => m.id === department.headId)?.name
    ?? candidates.find((m) => m.id === department.headId)?.name;

  const stats = useMemo(
    () => ({
      attendancePct: average(members.map((m) => m.attendancePct)),
      performancePct: average(members.map((m) => m.performanceScore)),
    }),
    [members],
  );

  const candidateDepartments = useMemo(
    () => Array.from(new Set(candidates.map((c) => c.department))).sort(),
    [candidates],
  );
  const filteredCandidates = useMemo(
    () => (sourceDeptFilter ? candidates.filter((c) => c.department === sourceDeptFilter) : candidates),
    [candidates, sourceDeptFilter],
  );

  async function toggleArchived() {
    setArchiveBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/superadmin/departments/${department.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archived: !department.archived }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not update department.");
        return;
      }
      setDepartment(data.department);
    } finally {
      setArchiveBusy(false);
    }
  }

  async function removeMember(employee: EmployeeOverview) {
    setBusyId(employee.id);
    setError(null);
    try {
      const res = await fetch(`/api/superadmin/employees/${employee.id}/lifecycle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "transfer", department: "Unassigned" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not remove employee.");
        return;
      }
      setMembers((prev) => prev.filter((m) => m.id !== employee.id));
      setCandidates((prev) => [data.employee, ...prev]);
      if (department.headId === employee.id) {
        const headRes = await fetch(`/api/superadmin/departments/${department.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ headId: null }),
        });
        const headData = await headRes.json();
        if (headRes.ok) setDepartment(headData.department);
      }
    } finally {
      setBusyId(null);
    }
  }

  function toggleSelected(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  }

  async function addSelected() {
    if (selectedIds.length === 0) return;
    setAddBusy(true);
    setError(null);
    try {
      const added: EmployeeOverview[] = [];
      for (const id of selectedIds) {
        const res = await fetch(`/api/superadmin/employees/${id}/lifecycle`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "transfer", department: department.name }),
        });
        const data = await res.json();
        if (res.ok) added.push(data.employee);
      }
      setMembers((prev) => [...prev, ...added]);
      setCandidates((prev) => prev.filter((c) => !added.some((a) => a.id === c.id)));
      setSelectedIds([]);
      setAddOpen(false);
    } finally {
      setAddBusy(false);
    }
  }

  return (
    <div>
      <Link href={withBase(base, "/employees/department")} className={styles.backLink}>
        <ArrowLeft size={14} /> All departments
      </Link>

      <div className={styles.header}>
        <div className={styles.headerBody}>
          <div className={styles.nameRow}>
            <h1 className={styles.name}>{department.name}</h1>
            {department.archived && <span className={styles.archivedBadge}>Archived</span>}
          </div>
          {department.description && <p className={styles.description}>{department.description}</p>}
          <span className={styles.meta}>Head: {headName ?? "Unassigned"}</span>
        </div>
        <div className={styles.headerActions}>
          <button type="button" className={styles.editButton} onClick={() => setEditOpen(true)}>
            <Pencil size={13} strokeWidth={2.25} /> Edit
          </button>
          <button
            type="button"
            className={department.archived ? styles.reactivateButton : styles.archiveButton}
            onClick={toggleArchived}
            disabled={archiveBusy}
          >
            {archiveBusy ? "Saving..." : department.archived ? "Reactivate" : "Archive"}
          </button>
        </div>
      </div>

      <div className={styles.statsRow}>
        <div className={styles.stat}>
          <span className={styles.statValue}>{members.length}</span>
          <span className={styles.statLabel}>Employees</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>{stats.attendancePct}%</span>
          <span className={styles.statLabel}>Avg. attendance</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>{stats.performancePct}%</span>
          <span className={styles.statLabel}>Avg. performance</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>{projects.length}</span>
          <span className={styles.statLabel}>Projects</span>
        </div>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.tabStrip}>
        <button type="button" className={`${styles.tab} ${tab === "overview" ? styles.tabActive : ""}`} onClick={() => setTab("overview")}>
          Members ({members.length})
        </button>
        <button type="button" className={`${styles.tab} ${tab === "projects" ? styles.tabActive : ""}`} onClick={() => setTab("projects")}>
          Projects ({projects.length})
        </button>
        <button type="button" className={`${styles.tab} ${tab === "activity" ? styles.tabActive : ""}`} onClick={() => setTab("activity")}>
          Activity ({logs.length})
        </button>
      </div>

      {tab === "overview" && (
        <div>
          <div className={styles.sectionHeader}>
            <button
              type="button"
              className={styles.addMemberButton}
              onClick={() => {
                setSourceDeptFilter("");
                setSelectedIds([]);
                setAddOpen(true);
              }}
            >
              <UserPlus size={13} strokeWidth={2.25} /> Add employees
            </button>
          </div>
          {members.length === 0 ? (
            <div className={styles.empty}>No employees in this department yet.</div>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Designation</th>
                    <th>Status</th>
                    <th>Attendance</th>
                    <th>Performance</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {members.map((m) => (
                    <tr key={m.id}>
                      <td>
                        <Link href={withBase(base, `/employees/${m.id}`)} className={styles.memberLink}>
                          {m.name}
                        </Link>
                      </td>
                      <td>{m.designation}</td>
                      <td>{m.status}</td>
                      <td>{m.attendancePct}%</td>
                      <td>{m.performanceScore}%</td>
                      <td>
                        <button
                          type="button"
                          className={styles.removeButton}
                          onClick={() => removeMember(m)}
                          disabled={busyId === m.id}
                          aria-label={`Remove ${m.name}`}
                          title="Remove from department"
                        >
                          <UserMinus size={13} strokeWidth={2.25} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === "projects" && (
        <div className={styles.projectList}>
          {projects.length === 0 && <div className={styles.empty}>No projects involve this department yet.</div>}
          {projects.map((p) => (
            <div key={p.id} className={styles.projectRow}>
              <div className={styles.projectBody}>
                <span className={styles.projectName}>{p.name}</span>
                {p.description && <span className={styles.projectDesc}>{p.description}</span>}
                <span className={styles.meta}>
                  {p.memberIds.length} member{p.memberIds.length === 1 ? "" : "s"}
                  {p.deadline ? ` · Deadline ${formatDate(p.deadline)}` : ""}
                </span>
              </div>
              <span className={`${styles.projStatus} ${styles[PROJECT_STATUS_CLASS[p.status]]}`}>{p.status}</span>
            </div>
          ))}
        </div>
      )}

      {tab === "activity" && (
        <SystemLogViewer initialLogs={logs} />
      )}

      {editOpen && (
        <DepartmentFormModal
          mode="edit"
          department={department}
          employees={[...members, ...candidates]}
          onClose={() => setEditOpen(false)}
          onSaved={(d) => {
            setDepartment(d);
            setEditOpen(false);
          }}
          onEmployeeCreated={(employee) => setMembers((prev) => [...prev, employee])}
        />
      )}

      {addOpen && (
        <div
          className={formStyles.overlay}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setAddOpen(false);
          }}
        >
          <div className={formStyles.panel} role="dialog" aria-modal="true" aria-label="Add employees">
            <div className={formStyles.panelHeader}>
              <h2 className={formStyles.title}>Add employees to {department.name}</h2>
              <button type="button" className={formStyles.closeButton} onClick={() => setAddOpen(false)} aria-label="Close">
                <X size={16} />
              </button>
            </div>
            {candidates.length === 0 ? (
              <p className={styles.empty}>Every employee is already in this department.</p>
            ) : (
              <div className={formStyles.checklistSection}>
                <label className={formStyles.field}>
                  <span>Fetch from department</span>
                  <select value={sourceDeptFilter} onChange={(e) => setSourceDeptFilter(e.target.value)}>
                    <option value="">All departments</option>
                    {candidateDepartments.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </label>
                <div className={formStyles.checklist}>
                  {filteredCandidates.map((emp) => (
                    <label key={emp.id} className={formStyles.checklistItem}>
                      <input type="checkbox" checked={selectedIds.includes(emp.id)} onChange={() => toggleSelected(emp.id)} />
                      {emp.name} · {emp.department}
                    </label>
                  ))}
                  {filteredCandidates.length === 0 && (
                    <span className={styles.empty}>No employees in that department.</span>
                  )}
                </div>
              </div>
            )}
            <div className={formStyles.actions}>
              <button type="button" className={formStyles.cancelButton} onClick={() => setAddOpen(false)}>
                Cancel
              </button>
              <button type="button" className={formStyles.saveButton} onClick={addSelected} disabled={addBusy || selectedIds.length === 0}>
                {addBusy ? "Adding..." : `Add ${selectedIds.length || ""} employee${selectedIds.length === 1 ? "" : "s"}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
