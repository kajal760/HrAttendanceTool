"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import styles from "../lifecycle/Lifecycle.module.css";

const OPTIONS: { key: string; label: string }[] = [
  { key: "week", label: "Weekly" },
  { key: "month", label: "Monthly" },
  { key: "custom", label: "Custom range" },
];

interface TimesheetPeriodFilterProps {
  period: string;
  anchor: string;
  from: string;
  to: string;
}

// Date-range filter for Timesheet Overview - same URL-driven pattern as
// Attendance's `PeriodFilter`, but only the three ranges the spec calls for
// (Weekly / Monthly / Custom), not that filter's full day/quarter/6-month set.
export default function TimesheetPeriodFilter({ period, anchor, from, to }: TimesheetPeriodFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [customFrom, setCustomFrom] = useState(from);
  const [customTo, setCustomTo] = useState(to);

  function go(params: Record<string, string>) {
    const qs = new URLSearchParams(params).toString();
    router.replace(`${pathname}?${qs}`, { scroll: false });
  }

  return (
    <div className={styles.toolbar} style={{ marginBottom: 14 }}>
      <select
        className={styles.filterSelect}
        value={period}
        aria-label="Date range"
        onChange={(e) => {
          const next = e.target.value;
          if (next === "custom") go({ period: "custom", date: anchor, from: customFrom, to: customTo });
          else go({ period: next, date: anchor });
        }}
      >
        {OPTIONS.map((o) => (
          <option key={o.key} value={o.key}>
            {o.label}
          </option>
        ))}
      </select>

      {period === "custom" ? (
        <>
          <label className={styles.hint} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            From
            <input type="date" className={styles.filterSelect} value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
          </label>
          <label className={styles.hint} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            To
            <input type="date" className={styles.filterSelect} value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
          </label>
          <button
            type="button"
            className={styles.primaryButton}
            disabled={!customFrom || !customTo}
            onClick={() => go({ period: "custom", date: anchor, from: customFrom, to: customTo })}
          >
            Apply range
          </button>
        </>
      ) : (
        <label className={styles.hint} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          {period === "week" ? "Week containing" : "Month containing"}
          <input
            type="date"
            className={styles.filterSelect}
            value={anchor}
            onChange={(e) => {
              if (e.target.value) go({ period, date: e.target.value });
            }}
          />
        </label>
      )}
    </div>
  );
}
