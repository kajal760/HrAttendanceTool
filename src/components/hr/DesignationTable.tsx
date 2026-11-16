"use client";

import { useMemo, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import type { EmployeeOverview, OrgRegistryItem } from "@/types/hr";
import styles from "./lifecycle/Lifecycle.module.css";

interface DesignationTableProps {
  initialItems: OrgRegistryItem[];
  // Cross-referenced by name (`employee.designation`) to fill in the
  // Assigned To / Department columns - same string-match convention
  // `department-store.ts` already uses for department membership.
  employees: EmployeeOverview[];
  // Org Structure's HR-only editing rule applies here too - the
  // `/api/superadmin/org/designations` routes enforce it server side, this
  // just keeps an Admin view from showing controls it can't use.
  readOnly?: boolean;
}

function assignedSummary(names: string[]): string {
  if (names.length === 0) return "Unassigned";
  if (names.length <= 2) return names.join(", ");
  return `${names.slice(0, 2).join(", ")} +${names.length - 2} more`;
}

// Table view of the designation registry - backed by the same
// `/api/superadmin/org/designations` endpoints `OrgRegistryManager` uses,
// just rendered as a table (with a search box and inline rename/delete)
// instead of a plain list.
export default function DesignationTable({ initialItems, employees, readOnly = false }: DesignationTableProps) {
  const [items, setItems] = useState(initialItems);
  const [query, setQuery] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const byDesignation = useMemo(() => {
    const map = new Map<string, { names: string[]; departments: string[] }>();
    for (const e of employees) {
      const entry = map.get(e.designation) ?? { names: [], departments: [] };
      entry.names.push(e.name);
      if (!entry.departments.includes(e.department)) entry.departments.push(e.department);
      map.set(e.designation, entry);
    }
    return map;
  }, [employees]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => {
      const assigned = byDesignation.get(item.name);
      return (
        item.name.toLowerCase().includes(q) ||
        assigned?.names.some((n) => n.toLowerCase().includes(q)) ||
        assigned?.departments.some((d) => d.toLowerCase().includes(q))
      );
    });
  }, [items, query, byDesignation]);

  function startEdit(item: OrgRegistryItem) {
    setError(null);
    setEditingId(item.id);
    setEditingName(item.name);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditingName("");
  }

  async function commitEdit(item: OrgRegistryItem) {
    const trimmed = editingName.trim();
    if (!trimmed || trimmed === item.name) {
      cancelEdit();
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/superadmin/org/designations/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not update that designation.");
        return;
      }
      setItems((prev) => prev.map((i) => (i.id === item.id ? data.item : i)));
      cancelEdit();
    } finally {
      setSaving(false);
    }
  }

  function onEditKeyDown(e: KeyboardEvent<HTMLInputElement>, item: OrgRegistryItem) {
    if (e.key === "Escape") cancelEdit();
    if (e.key === "Enter") {
      e.preventDefault();
      void commitEdit(item);
    }
  }

  async function add(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/superadmin/org/designations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not add that designation.");
        return;
      }
      setItems((prev) => [...prev, data.item]);
      setName("");
      setShowAddForm(false);
    } finally {
      setSubmitting(false);
    }
  }

  function cancelAdd() {
    setShowAddForm(false);
    setName("");
    setError(null);
  }

  async function remove(item: OrgRegistryItem) {
    setRemovingId(item.id);
    setError(null);
    try {
      const res = await fetch(`/api/superadmin/org/designations/${item.id}`, { method: "DELETE" });
      if (res.ok) {
        setItems((prev) => prev.filter((i) => i.id !== item.id));
      } else {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Could not remove that designation.");
      }
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <>
      <div className={styles.toolbar}>
        <input
          type="text"
          placeholder="Search designations..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className={styles.searchInput}
        />
        {!readOnly && !showAddForm && (
          <button type="button" className={styles.primaryButton} onClick={() => setShowAddForm(true)}>
            <Plus size={14} /> Add Designation
          </button>
        )}
      </div>
      {!readOnly && showAddForm && (
        <form style={{ display: "flex", gap: 6, marginBottom: 14 }} onSubmit={add}>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="New designation name..."
            value={name}
            autoFocus
            onChange={(e) => setName(e.target.value)}
          />
          <button type="submit" className={styles.primaryButton} disabled={submitting || !name.trim()}>
            <Plus size={14} /> Create
          </button>
          <button type="button" className={styles.actionButton} onClick={cancelAdd}>
            Cancel
          </button>
        </form>
      )}
      {error && <div className={styles.error} style={{ marginBottom: 10 }}>{error}</div>}
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Sr.</th>
              <th>Designation</th>
              <th>Assigned To</th>
              <th>Department</th>
              {!readOnly && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.map((item, index) => {
              const assigned = byDesignation.get(item.name);
              return (
                <tr key={item.id}>
                  <td className={styles.muted}>{index + 1}</td>
                  <td>
                    {editingId === item.id ? (
                      <input
                        type="text"
                        className={styles.filterSelect}
                        value={editingName}
                        autoFocus
                        disabled={saving}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={(e) => onEditKeyDown(e, item)}
                        onBlur={() => commitEdit(item)}
                      />
                    ) : (
                      item.name
                    )}
                  </td>
                  <td>{assignedSummary(assigned?.names ?? [])}</td>
                  <td className={!assigned?.departments.length ? styles.muted : undefined}>
                    {assigned?.departments.length ? assigned.departments.join(", ") : "—"}
                  </td>
                  {!readOnly && (
                    <td>
                      {editingId !== item.id && (
                        <div style={{ display: "flex", gap: 6 }}>
                          <button
                            type="button"
                            className={styles.actionButton}
                            onClick={() => startEdit(item)}
                            aria-label={`Edit ${item.name}`}
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            type="button"
                            className={styles.actionButton}
                            onClick={() => remove(item)}
                            disabled={removingId === item.id}
                            aria-label={`Delete ${item.name}`}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className={styles.empty}>{items.length === 0 ? "No designations yet." : "No designations match."}</div>
        )}
      </div>
    </>
  );
}
