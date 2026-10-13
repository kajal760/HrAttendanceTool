"use client";

import styles from "../lifecycle/Lifecycle.module.css";

export type WorkModeFilter = "" | "Office" | "WFH";

// Client-side WFO / WFH switch. Filters the rows already on the page - no reload.
export default function WorkModeSwitch({ value, onChange }: { value: WorkModeFilter; onChange: (v: WorkModeFilter) => void }) {
  const options: { key: WorkModeFilter; label: string }[] = [
    { key: "", label: "All" },
    { key: "Office", label: "WFO (Office)" },
    { key: "WFH", label: "WFH" },
  ];
  return (
    <div className={styles.toolbar} style={{ marginBottom: 0 }} role="group" aria-label="Work mode">
      {options.map((o) => (
        <button
          key={o.label}
          type="button"
          className={`${styles.filterSelect} ${value === o.key ? styles.tabActive : ""}`}
          aria-pressed={value === o.key}
          onClick={() => onChange(o.key)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
