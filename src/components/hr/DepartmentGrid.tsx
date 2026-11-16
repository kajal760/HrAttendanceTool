"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Archive, ArchiveRestore, Pencil, Plus, Trash2 } from "lucide-react";
import type { Department, EmployeeOverview } from "@/types/hr";
import { withBase } from "@/lib/portal";
import { usePortalBase } from "./usePortalBase";
import DepartmentFormModal from "./DepartmentFormModal";
import ConfirmDialog from "./lifecycle/ConfirmDialog";
import styles from "./DepartmentGrid.module.css";

export interface DepartmentSummary extends Department {
  headName?: string;
  employeeCount: number;
  attendancePct: number;
  performancePct: number;
  projectCount: number;
}

interface DepartmentGridProps {
  departments: DepartmentSummary[];
  employees: EmployeeOverview[];
}

// Mirrors EmployeeGrid's shape: a toolbar (search + "Add department"), a card
// per department, and an Add/Edit modal - plus a quick archive/reactivate
// toggle on each card since that's a one-click action, not a full edit.
export default function DepartmentGrid({ departments: initial, employees: initialEmployees }: DepartmentGridProps) {
  const base = usePortalBase();
  const [departments, setDepartments] = useState<DepartmentSummary[]>(initial);
  const [employees, setEmployees] = useState<EmployeeOverview[]>(initialEmployees);
  const [query, setQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit" | null>(null);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [archiveBusyId, setArchiveBusyId] = useState<string | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<DepartmentSummary | null>(null);
  const [archiveImpact, setArchiveImpact] = useState(0);
  const [archiving, setArchiving] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DepartmentSummary | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return departments.filter((d) => {
      if (!showArchived && d.archived) return false;
      if (q && !d.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [departments, query, showArchived]);

  function openAdd() {
    setEditingDepartment(null);
    setModalMode("add");
  }

  function openEdit(department: Department) {
    setEditingDepartment(department);
    setModalMode("edit");
  }

  function closeModal() {
    setModalMode(null);
    setEditingDepartment(null);
  }

  function mergeSummary(department: Department): DepartmentSummary {
    const existing = departments.find((d) => d.id === department.id);
    const head = employees.find((e) => e.id === department.headId);
    const members = employees.filter((e) => e.department === department.name);
    return {
      ...department,
      headName: head?.name,
      employeeCount: members.length,
      attendancePct: existing?.attendancePct ?? 0,
      performancePct: existing?.performancePct ?? 0,
      projectCount: existing?.projectCount ?? 0,
    };
  }

  function handleSaved(department: Department) {
    const summary = mergeSummary(department);
    setDepartments((prev) =>
      modalMode === "add" ? [summary, ...prev] : prev.map((d) => (d.id === department.id ? summary : d)),
    );
    closeModal();
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/superadmin/departments/${deleteTarget.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setDeleteError(data.error ?? "Could not delete department.");
        return;
      }
      setDepartments((prev) => prev.filter((d) => d.id !== deleteTarget.id));
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  // Archiving shows the active-employee impact first; restoring is
  // one-click but the backend rejects it once the 7-day window has passed.
  async function openArchiveConfirm(department: DepartmentSummary) {
    setListError(null);
    setArchiveBusyId(department.id);
    try {
      const res = await fetch(`/api/superadmin/departments/${department.id}/archive-impact`);
      const data = await res.json();
      if (!res.ok) {
        setListError(data.error ?? "Could not check this department's impact.");
        return;
      }
      setArchiveImpact(data.employeeCount);
      setArchiveTarget(department);
    } finally {
      setArchiveBusyId(null);
    }
  }

  async function confirmArchive() {
    if (!archiveTarget) return;
    setArchiving(true);
    try {
      const res = await fetch(`/api/superadmin/departments/${archiveTarget.id}/archive`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setListError(data.error ?? "Could not archive department.");
        return;
      }
      setDepartments((prev) => prev.map((d) => (d.id === archiveTarget.id ? mergeSummary(data.department) : d)));
      setArchiveTarget(null);
    } finally {
      setArchiving(false);
    }
  }

  async function restore(department: DepartmentSummary) {
    setListError(null);
    setArchiveBusyId(department.id);
    try {
      const res = await fetch(`/api/superadmin/departments/${department.id}/restore`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setListError(data.error ?? "Could not restore department.");
        return;
      }
      setDepartments((prev) => prev.map((d) => (d.id === department.id ? mergeSummary(data.department) : d)));
    } finally {
      setArchiveBusyId(null);
    }
  }

  return (
    <div>
      <div className={styles.toolbar}>
        <input
          type="text"
          placeholder="Search departments..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className={styles.searchInput}
        />
        <label className={styles.archivedToggle}>
          <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
          Show archived
        </label>
        <button type="button" className={styles.addButton} onClick={openAdd}>
          <Plus size={14} strokeWidth={2.25} />
          Add department
        </button>
      </div>

      {listError && <div style={{ fontSize: 12, color: "var(--color-danger)", marginBottom: 10 }}>{listError}</div>}

      <div className={styles.grid}>
        {filtered.map((department) => (
          <div key={department.id} className={`${styles.card} ${department.archived ? styles.cardArchived : ""}`}>
            <div className={styles.cardHeader}>
              <Link href={withBase(base, `/employees/department/${department.id}`)} className={styles.name}>
                {department.name}
              </Link>
              {department.archived && <span className={styles.archivedBadge}>Archived</span>}
            </div>
            {department.description && <p className={styles.description}>{department.description}</p>}
            <span className={styles.meta}>
              Head: {department.headName ?? "Unassigned"}
            </span>

            <div className={styles.statsRow}>
              <div className={styles.stat}>
                <span className={styles.statValue}>{department.employeeCount}</span>
                <span className={styles.statLabel}>Employees</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statValue}>{department.attendancePct}%</span>
                <span className={styles.statLabel}>Attendance</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statValue}>{department.performancePct}%</span>
                <span className={styles.statLabel}>Performance</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statValue}>{department.projectCount}</span>
                <span className={styles.statLabel}>Projects</span>
              </div>
            </div>

            <div className={styles.cardActions}>
              <Link href={withBase(base, `/employees/department/${department.id}`)} className={styles.viewLink}>
                View department →
              </Link>
              <button
                type="button"
                className={styles.iconButton}
                onClick={() => {
                  setDeleteError(null);
                  setDeleteTarget(department);
                }}
                aria-label="Delete department"
                title="Delete"
              >
                <Trash2 size={13} strokeWidth={2.25} />
              </button>
              <button type="button" className={styles.iconButton} onClick={() => openEdit(department)} aria-label="Edit department">
                <Pencil size={13} strokeWidth={2.25} />
              </button>
              <button
                type="button"
                className={styles.iconButton}
                onClick={() => (department.archived ? restore(department) : openArchiveConfirm(department))}
                disabled={archiveBusyId === department.id}
                aria-label={department.archived ? "Reactivate department" : "Archive department"}
                title={department.archived ? "Reactivate" : "Archive"}
              >
                {department.archived ? <ArchiveRestore size={13} strokeWidth={2.25} /> : <Archive size={13} strokeWidth={2.25} />}
              </button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <div className={styles.empty}>No departments match.</div>}
      </div>

      {deleteTarget && (
        <ConfirmDialog
          title="Delete Department"
          message={`Delete "${deleteTarget.name}"? This can only succeed if no employees are still in it.${deleteError ? ` ${deleteError}` : ""}`}
          confirmLabel="Delete Department"
          danger
          busy={deleting}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {archiveTarget && (
        <ConfirmDialog
          title="Archive Department"
          message={`Archive "${archiveTarget.name}"? ${archiveImpact} active employee${archiveImpact === 1 ? "" : "s"} will stay assigned but the department will be hidden from pickers until restored within 7 days.`}
          confirmLabel="Archive Department"
          busy={archiving}
          onConfirm={confirmArchive}
          onCancel={() => setArchiveTarget(null)}
        />
      )}

      {modalMode && (
        <DepartmentFormModal
          mode={modalMode}
          department={modalMode === "edit" ? (editingDepartment ?? undefined) : undefined}
          employees={employees}
          onClose={closeModal}
          onSaved={handleSaved}
          onEmployeeCreated={(employee) => setEmployees((prev) => [employee, ...prev])}
        />
      )}
    </div>
  );
}
