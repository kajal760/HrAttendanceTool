"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import type { ApiLeaveType } from "@/lib/api/types";
import LeaveTypeFormModal from "./LeaveTypeFormModal";
import styles from "./Leave.module.css";

interface LeaveTypeManagerProps {
  initialTypes: ApiLeaveType[];
}

function quotaLabel(type: ApiLeaveType): string {
  if (type.annualQuota !== null) return `${type.annualQuota} day(s)/year`;
  if (type.perOccurrenceDays !== null) return `${type.perOccurrenceDays} day(s)/occurrence`;
  return "No fixed quota";
}

// Edit-only - the backend doesn't support creating or deleting leave types,
// so there's no "Add" affordance here.
export default function LeaveTypeManager({ initialTypes }: LeaveTypeManagerProps) {
  const [types, setTypes] = useState(initialTypes);
  const [editing, setEditing] = useState<ApiLeaveType | null>(null);

  function handleSaved(updated: ApiLeaveType) {
    setTypes((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    setEditing(null);
  }

  return (
    <div className={styles.list}>
      {types.map((type) => (
        <div key={type.id} className={styles.row}>
          <div className={styles.rowMain}>
            <span className={styles.name}>
              {type.name} <span className={styles.meta}>({type.code})</span>
            </span>
            <span className={styles.meta}>
              {quotaLabel(type)}
              {type.maxDaysPerRequest !== null ? ` · up to ${type.maxDaysPerRequest}/request` : ""}
              {type.allowHalfDay ? " · half-day allowed" : ""}
            </span>
            {type.description && <p className={styles.reason}>{type.description}</p>}
          </div>
          <div className={styles.rowActions}>
            <span className={`${styles.badge} ${type.isActive ? styles["badge-approved"] : styles["badge-cancelled"]}`}>
              {type.isActive ? "Active" : "Inactive"}
            </span>
            <button
              type="button"
              className={styles.cancelButton}
              onClick={() => setEditing(type)}
            >
              <Pencil size={13} strokeWidth={2.25} /> Edit
            </button>
          </div>
        </div>
      ))}
      {types.length === 0 && <div className={styles.empty}>No leave types yet.</div>}

      {editing && (
        <LeaveTypeFormModal type={editing} onClose={() => setEditing(null)} onSaved={handleSaved} />
      )}
    </div>
  );
}
