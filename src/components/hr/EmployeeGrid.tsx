"use client";

import { useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Download, Upload, UserPlus } from "lucide-react";
import type { EmployeeOverview, EmployeeStatus } from "@/types/hr";
import EmployeeCard from "./EmployeeCard";
import EmployeeFormModal from "./EmployeeFormModal";
import { useDepartmentNames } from "./useDepartmentNames";
import styles from "./EmployeeGrid.module.css";

type SortField = "firstName" | "lastName" | "department" | "joinedOn" | "age" | "salary";

const SORT_FIELD_OPTIONS: { value: SortField; label: string }[] = [
  { value: "firstName", label: "First name" },
  { value: "lastName", label: "Last name" },
  { value: "department", label: "Department" },
  { value: "joinedOn", label: "Date joined" },
  { value: "age", label: "Age" },
  { value: "salary", label: "Salary" },
];

const STATUS_VALUES: EmployeeStatus[] = [
  "Onboarding",
  "Probation",
  "Active",
  "On Leave",
  "Notice Period",
  "Resigned",
  "Exited",
];

const CSV_COLUMNS: (keyof EmployeeOverview | "managerId")[] = [
  "id",
  "name",
  "email",
  "department",
  "designation",
  "status",
  "joinedOn",
  "age",
  "salary",
  "location",
  "workType",
  "managerId",
];

function toCsv(rows: EmployeeOverview[]): string {
  const escape = (v: unknown) => {
    const s = v === undefined || v === null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = CSV_COLUMNS.join(",");
  const lines = rows.map((r) => CSV_COLUMNS.map((c) => escape((r as unknown as Record<string, unknown>)[c])).join(","));
  return [header, ...lines].join("\n");
}

function lastNameOf(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  return parts[parts.length - 1] ?? fullName;
}

function sortValue(employee: EmployeeOverview, field: SortField): string | number {
  switch (field) {
    case "firstName":
      return employee.name.trim().split(/\s+/)[0]?.toLowerCase() ?? "";
    case "lastName":
      return lastNameOf(employee.name).toLowerCase();
    case "department":
      return employee.department.toLowerCase();
    case "joinedOn":
      return new Date(employee.joinedOn).getTime();
    case "age":
      return employee.age;
    case "salary":
      return employee.salary;
  }
}

interface EmployeeGridProps {
  employees: EmployeeOverview[];
  initialDepartmentFilter?: string;
}

// Only one card is expanded at a time - opening another closes the first.
// The expanded card spans 2 grid rows (double its collapsed height) via
// CSS Grid `dense` packing, so the rest of the roster reflows around it.
export default function EmployeeGrid({ employees: initialEmployees, initialDepartmentFilter }: EmployeeGridProps) {
  const [employees, setEmployees] = useState<EmployeeOverview[]>(initialEmployees);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>("firstName");
  const [modalMode, setModalMode] = useState<"add" | "edit" | null>(null);
  const [editingEmployee, setEditingEmployee] = useState<EmployeeOverview | null>(null);

  const [query, setQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState(initialDepartmentFilter ?? "");
  const [designationFilter, setDesignationFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<EmployeeStatus | "">("");

  const [showImport, setShowImport] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ added: number; skipped: number; errors: { row: number; error: string }[] } | null>(null);
  const importFileRef = useRef<HTMLInputElement>(null);

  const departments = useDepartmentNames().names;
  const designations = useMemo(
    () => Array.from(new Set(employees.map((e) => e.designation))).sort(),
    [employees],
  );
  const locations = useMemo(
    () => Array.from(new Set(employees.map((e) => e.location).filter((l): l is string => !!l))).sort(),
    [employees],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return employees.filter((e) => {
      if (q && !(e.name.toLowerCase().includes(q) || e.employeeCode.toLowerCase().includes(q))) return false;
      if (departmentFilter && e.department !== departmentFilter) return false;
      if (designationFilter && e.designation !== designationFilter) return false;
      if (locationFilter && e.location !== locationFilter) return false;
      if (statusFilter && e.status !== statusFilter) return false;
      return true;
    });
  }, [employees, query, departmentFilter, designationFilter, locationFilter, statusFilter]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const va = sortValue(a, sortField);
      const vb = sortValue(b, sortField);
      if (typeof va === "string" && typeof vb === "string") {
        return va.localeCompare(vb);
      }
      return (va as number) - (vb as number);
    });
  }, [filtered, sortField]);

  function exportCsv() {
    const filename = `employees-${new Date().toISOString().slice(0, 10)}.csv`;
    const csv = toCsv(sorted);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    fetch("/api/superadmin/logs/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ detail: `${filename} · ${sorted.length} rows` }),
    }).catch(() => {
      // Logging the export is best-effort - the CSV already downloaded either way.
    });
  }

  async function handleImportSubmit(e: FormEvent) {
    e.preventDefault();
    const file = importFileRef.current?.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.set("file", file);

    setImporting(true);
    setImportResult(null);
    try {
      const res = await fetch("/api/superadmin/employees/bulk-import", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        setImportResult({ added: 0, skipped: 0, errors: [{ row: 0, error: data.error ?? "Import failed." }] });
        return;
      }
      setImportResult(data);
      if (data.added > 0) {
        const listRes = await fetch("/api/superadmin/employees");
        const listData = await listRes.json();
        setEmployees(listData.employees ?? []);
      }
      if (importFileRef.current) importFileRef.current.value = "";
    } finally {
      setImporting(false);
    }
  }

  function openAddModal() {
    setEditingEmployee(null);
    setModalMode("add");
  }

  function openEditModal(employee: EmployeeOverview) {
    setEditingEmployee(employee);
    setModalMode("edit");
  }

  function closeModal() {
    setModalMode(null);
    setEditingEmployee(null);
  }

  function handleSaved(employee: EmployeeOverview) {
    setEmployees((prev) =>
      modalMode === "add"
        ? [employee, ...prev]
        : prev.map((e) => (e.id === employee.id ? employee : e)),
    );
    closeModal();
  }

  function handleEmployeeUpdated(employee: EmployeeOverview) {
    setEmployees((prev) => prev.map((e) => (e.id === employee.id ? employee : e)));
  }

  return (
    <div>
      <div className={styles.toolbar}>
        <div className={styles.sortControls}>
          <label htmlFor="employee-sort-field" className={styles.sortLabel}>
            Sort by
          </label>
          <select
            id="employee-sort-field"
            value={sortField}
            onChange={(e) => setSortField(e.target.value as SortField)}
          >
            {SORT_FIELD_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.toolbarButtons}>
          <button type="button" className={styles.secondaryButton} onClick={exportCsv}>
            <Download size={14} strokeWidth={2.25} />
            Export
          </button>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => setShowImport((v) => !v)}
          >
            <Upload size={14} strokeWidth={2.25} />
            Bulk import
          </button>
          <button type="button" className={styles.addButton} onClick={openAddModal}>
            <UserPlus size={14} strokeWidth={2.25} />
            Add employee
          </button>
        </div>
      </div>

      <div className={styles.filterBar}>
        <input
          type="text"
          placeholder="Search by name..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className={styles.searchInput}
        />
        <select value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)} aria-label="Filter by department">
          <option value="">All departments</option>
          {departments.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
        <select value={designationFilter} onChange={(e) => setDesignationFilter(e.target.value)} aria-label="Filter by designation">
          <option value="">All designations</option>
          {designations.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
        <select value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)} aria-label="Filter by location">
          <option value="">All locations</option>
          {locations.map((l) => (
            <option key={l} value={l}>{l}</option>
          ))}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as EmployeeStatus | "")} aria-label="Filter by status">
          <option value="">All statuses</option>
          {STATUS_VALUES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {showImport && (
        <form className={styles.importForm} onSubmit={handleImportSubmit}>
          <input ref={importFileRef} type="file" accept=".csv,text/csv" />
          <span className={styles.importHint}>
            CSV columns: name, email, department, designation, joinedOn, age, salary (optional: managerId, location, workType)
          </span>
          <button type="submit" className={styles.saveButton} disabled={importing}>
            {importing ? "Importing..." : "Import"}
          </button>
          <button type="button" className={styles.cancelButton} onClick={() => setShowImport(false)}>
            Close
          </button>
        </form>
      )}
      {importResult && (
        <div className={importResult.skipped > 0 ? styles.importWarning : styles.importSuccess}>
          Added {importResult.added}, skipped {importResult.skipped}.
          {importResult.errors.length > 0 && (
            <ul className={styles.importErrors}>
              {importResult.errors.map((e, i) => (
                <li key={i}>{e.row > 0 ? `Row ${e.row}: ` : ""}{e.error}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className={styles.grid}>
        {sorted.map((employee) => (
          <EmployeeCard
            key={employee.id}
            employee={employee}
            expanded={expandedId === employee.id}
            onToggle={() =>
              setExpandedId((current) => (current === employee.id ? null : employee.id))
            }
            onEdit={openEditModal}
          />
        ))}
      </div>

      {modalMode && (
        <EmployeeFormModal
          mode={modalMode}
          employee={modalMode === "edit" ? (editingEmployee ?? undefined) : undefined}
          onClose={closeModal}
          onSaved={handleSaved}
          onEmployeeUpdated={handleEmployeeUpdated}
        />
      )}
    </div>
  );
}
