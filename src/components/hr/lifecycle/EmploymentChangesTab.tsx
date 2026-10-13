"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Plus } from "lucide-react";
import type { EmployeeOverview } from "@/types/hr";
import type { Role } from "@/types/auth";
import { toneClass } from "./badge-tones";
import TransferModal from "./TransferModal";
import PromotionModal from "./PromotionModal";
import ConfirmationModal from "./ConfirmationModal";
import RoleChangeModal from "./RoleChangeModal";
import styles from "./Lifecycle.module.css";

export type ChangeType = "Confirmation" | "Transfer" | "Promotion" | "Role Change";
const ALL_CHANGE_TYPES: ChangeType[] = ["Confirmation", "Transfer", "Promotion", "Role Change"];

interface ChangeRow {
  id: string;
  employeeId: string;
  employeeName: string;
  changeType: ChangeType;
  previous: string;
  next: string;
  effectiveDate: string;
}

function deriveRows(employees: EmployeeOverview[]): ChangeRow[] {
  const rows: ChangeRow[] = [];
  for (const e of employees) {
    for (const ev of e.lifecycleHistory) {
      let changeType: ChangeType | null = null;
      if (ev.type === "Confirmed" || ev.type === "Confirmation updated") changeType = "Confirmation";
      else if (ev.type === "Transferred") changeType = "Transfer";
      else if (ev.type === "Promoted") changeType = "Promotion";
      else if (ev.type === "Role changed") changeType = "Role Change";
      if (!changeType) continue;
      rows.push({
        id: ev.id,
        employeeId: e.id,
        employeeName: e.name,
        changeType,
        previous: ev.previousValue ?? "-",
        next: ev.newValue ?? "-",
        effectiveDate: ev.date,
      });
    }
  }
  return rows.sort((a, b) => (a.effectiveDate < b.effectiveDate ? 1 : -1));
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { month: "short", day: "numeric", year: "numeric" });
}

interface ManagerOption {
  id: string;
  name: string;
}

interface EmploymentChangesTabProps {
  employees: EmployeeOverview[];
  managerOptions: ManagerOption[];
  onEmployeeUpdated: (employee: EmployeeOverview) => void;
  onViewLifecycle: (id: string) => void;
  // Restricts this view to a subset of change types - e.g. the dedicated
  // "Confirmation", "Transfer & Promotion", and "Role Change" Lifecycle
  // tabs all reuse this one component, just scoped differently. Defaults to
  // every type (the original, unscoped "Employment Changes" behavior).
  types?: ChangeType[];
}

export default function EmploymentChangesTab({
  employees,
  managerOptions,
  onEmployeeUpdated,
  onViewLifecycle,
  types = ALL_CHANGE_TYPES,
}: EmploymentChangesTabProps) {
  const [typeFilter, setTypeFilter] = useState<ChangeType | "">("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [openModal, setOpenModal] = useState<ChangeType | null>(null);
  const [roles, setRoles] = useState<Record<string, Role | undefined>>({});

  function refreshRoles() {
    fetch("/api/superadmin/users")
      .then((r) => r.json())
      .then((data) => {
        const map: Record<string, Role | undefined> = {};
        for (const u of data.users ?? []) {
          if (u.employeeId) map[u.employeeId] = u.role;
        }
        setRoles(map);
      })
      .catch(() => {
        // best-effort - Role Change still works, just without showing "current role"
      });
  }

  useEffect(() => {
    refreshRoles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rows = useMemo(() => deriveRows(employees).filter((r) => types.includes(r.changeType)), [employees, types]);
  const filtered = typeFilter ? rows.filter((r) => r.changeType === typeFilter) : rows;

  function handleSaved(employee: EmployeeOverview) {
    onEmployeeUpdated(employee);
    setOpenModal(null);
    refreshRoles();
  }

  return (
    <div>
      <div className={styles.sectionHeader}>
        {types.length > 1 ? (
          <div className={styles.toolbar} style={{ marginBottom: 0 }}>
            <button
              type="button"
              className={`${styles.filterSelect} ${!typeFilter ? styles.tabActive : ""}`}
              onClick={() => setTypeFilter("")}
            >
              All
            </button>
            {types.map((t) => (
              <button
                key={t}
                type="button"
                className={`${styles.filterSelect} ${typeFilter === t ? styles.tabActive : ""}`}
                onClick={() => setTypeFilter(t)}
              >
                {t}
              </button>
            ))}
          </div>
        ) : (
          <span />
        )}

        <div style={{ position: "relative" }}>
          <button type="button" className={styles.primaryButton} onClick={() => setMenuOpen((v) => !v)}>
            <Plus size={14} strokeWidth={2.25} /> Add Employment Change <ChevronDown size={13} />
          </button>
          {menuOpen && (
            <div
              style={{
                position: "absolute",
                right: 0,
                top: "110%",
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-sm)",
                boxShadow: "var(--shadow-md)",
                zIndex: 50,
                minWidth: 180,
              }}
            >
              {types.map((t) => (
                <button
                  key={t}
                  type="button"
                  className={styles.actionButton}
                  style={{ display: "block", width: "100%", textAlign: "left", border: "none", borderRadius: 0 }}
                  onClick={() => {
                    setOpenModal(t);
                    setMenuOpen(false);
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Employee</th>
              <th>Change Type</th>
              <th>Previous Details</th>
              <th>New Details</th>
              <th>Effective Date</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id}>
                <td style={{ fontWeight: 600 }}>{r.employeeName}</td>
                <td>{r.changeType}</td>
                <td className={styles.muted}>{r.previous}</td>
                <td>{r.next}</td>
                <td>{formatDate(r.effectiveDate)}</td>
                <td>
                  <span className={toneClass(styles, "green")}>Completed</span>
                </td>
                <td>
                  <button type="button" className={styles.actionButton} onClick={() => onViewLifecycle(r.employeeId)}>
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className={styles.empty}>No employment changes recorded yet.</div>}
      </div>

      {openModal === "Transfer" && (
        <TransferModal employees={employees} managerOptions={managerOptions} onClose={() => setOpenModal(null)} onSaved={handleSaved} />
      )}
      {openModal === "Promotion" && (
        <PromotionModal employees={employees} onClose={() => setOpenModal(null)} onSaved={handleSaved} />
      )}
      {openModal === "Confirmation" && (
        <ConfirmationModal employees={employees} onClose={() => setOpenModal(null)} onSaved={handleSaved} />
      )}
      {openModal === "Role Change" && (
        <RoleChangeModal employees={employees} currentRoles={roles} onClose={() => setOpenModal(null)} onSaved={handleSaved} />
      )}
    </div>
  );
}
