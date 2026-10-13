"use client";

import { useState } from "react";
import type { RoleFeature, RoleName, RolePermissionsMatrix } from "@/types/hr";
import styles from "./RolesMatrix.module.css";

interface RolesMatrixProps {
  roles: RoleName[];
  features: RoleFeature[];
  initialMatrix: RolePermissionsMatrix;
}

// Editable reference matrix, not an enforcement mechanism - there's no
// auth/session system in this app yet for these checkboxes to gate.
export default function RolesMatrix({ roles, features, initialMatrix }: RolesMatrixProps) {
  const [matrix, setMatrix] = useState(initialMatrix);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function toggle(role: RoleName, featureKey: string) {
    setSaved(false);
    setMatrix((prev) => ({
      ...prev,
      [role]: { ...prev[role], [featureKey]: !prev[role]?.[featureKey] },
    }));
  }

  async function save() {
    setSaving(true);
    try {
      await fetch("/api/superadmin/roles", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matrix }),
      });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <p className={styles.note}>
        This is a reference matrix for planning access policy - it isn't enforced anywhere in the
        app yet, since there's no login/session system to enforce it against.
      </p>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Feature</th>
              {roles.map((r) => (
                <th key={r}>{r}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {features.map((f) => (
              <tr key={f.key}>
                <td>{f.label}</td>
                {roles.map((r) => (
                  <td key={r} className={styles.checkboxCell}>
                    <input
                      type="checkbox"
                      checked={Boolean(matrix[r]?.[f.key])}
                      onChange={() => toggle(r, f.key)}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className={styles.actions}>
        <button type="button" className={styles.saveButton} onClick={save} disabled={saving}>
          {saving ? "Saving..." : "Save changes"}
        </button>
        {saved && <span className={styles.savedNote}>Saved.</span>}
      </div>
    </div>
  );
}
