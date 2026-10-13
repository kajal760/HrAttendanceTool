"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import styles from "../lifecycle/Lifecycle.module.css";

const OPTIONS: { key: string; label: string }[] = [
  { key: "day", label: "Day" },
  { key: "week", label: "Weekly" },
  { key: "month", label: "Monthly" },
  { key: "quarter", label: "Quarterly" },
  { key: "six", label: "6 Months" },
  { key: "custom", label: "Custom range" },
];

interface PeriodFilterProps {
  period: string;
  anchor: string;
  from: string;
  to: string;
}

// Period selector for the Attendance and Timesheet pages. Everything is written
// to the URL, so the server recomputes the records for the chosen period.
export default function PeriodFilter({ period, anchor, from, to }: PeriodFilterProps) {
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
        aria-label="Period"
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
          {period === "day" ? "Date" : "Period containing"}
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
