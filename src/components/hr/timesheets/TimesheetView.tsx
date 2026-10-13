"use client";

import { useMemo, useState } from "react";
import type { DailyRecord } from "@/lib/hr/attendance-daily";
import { fmtHm, fmtHours, grossMin, netMin, timesheetStatus, type TimesheetStatus } from "@/lib/hr/timesheets";
import { toneClass, type BadgeTone } from "../lifecycle/badge-tones";
import styles from "../lifecycle/Lifecycle.module.css";


interface Person {
  id: string;
  name: string;
  employeeCode: string;
  department: string;
  designation: string;
}

interface TimesheetViewProps {
  rows: DailyRecord[];
  pendingKeys: string[];
  people: Person[];
  periodFrom: string;
  periodTo: string;
}

type SortKey = "name" | "department" | "date" | "gross" | "net" | "break" | "status";

const STATUS_TONE: Record<TimesheetStatus, BadgeTone> = {
  Complete: "green",
  "In Progress": "blue",
  Incomplete: "amber",
  "Correction Pending": "red",
};

function formatDay(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" });
}

function shortDay(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { timeZone: "UTC", day: "numeric", month: "short" });
}

// Simple vertical bars - no chart library needed for this view.
function Bars({ items }: { items: { label: string; value: number; title: string }[] }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  if (items.length === 0) return <div className={styles.empty}>No completed working days in this period.</div>;
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 160, overflowX: "auto", paddingBottom: 6 }}>
      {items.map((i) => (
        <div key={i.label + i.title} title={i.title} style={{ flex: "0 0 26px", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <div
            style={{
              width: 16,
              height: `${Math.max(2, Math.round((i.value / max) * 120))}px`,
              background: "var(--color-hr-accent)",
              borderRadius: 4,
            }}
          />
          <span style={{ fontSize: 10, color: "var(--color-text-muted)", whiteSpace: "nowrap" }}>{i.label}</span>
        </div>
      ))}
    </div>
  );
}

export default function TimesheetView({ rows, pendingKeys, people, periodFrom, periodTo }: TimesheetViewProps) {
  const pending = useMemo(() => new Set(pendingKeys), [pendingKeys]);
  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const departments = useMemo(() => Array.from(new Set(people.map((p) => p.department))).sort(), [people]);

  const decorated = useMemo(
    () =>
      rows.map((r) => ({
        r,
        status: timesheetStatus(r, pending),
        gross: grossMin(r),
        net: netMin(r),
      })),
    [rows, pending],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return decorated.filter(({ r }) => {
      if (q && !(r.name.toLowerCase().includes(q) || r.employeeCode.toLowerCase().includes(q))) return false;
      if (department && r.department !== department) return false;
      return true;
    });
  }, [decorated, query, department]);

  const sorted = useMemo(() => {
    const val = (d: (typeof filtered)[number]): string | number => {
      switch (sortKey) {
        case "name": return d.r.name;
        case "department": return d.r.department;
        case "date": return d.r.date;
        case "gross": return d.gross ?? -1;
        case "net": return d.net ?? -1;
        case "break": return d.r.checkIn ? d.r.breakMin : -1;
        case "status": return d.status;
      }
    };
    const list = [...filtered].sort((a, b) => {
      const va = val(a);
      const vb = val(b);
      if (typeof va === "string" && typeof vb === "string") return va.localeCompare(vb);
      return (va as number) - (vb as number);
    });
    return sortDir === "asc" ? list : list.reverse();
  }, [filtered, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  // Summary over whatever the table currently shows.
  const summary = useMemo(() => {
    const scope = filtered.map((f) => f.r);
    const attended = filtered.filter((f) => f.r.checkIn);
    const netSum = attended.reduce((s, f) => s + (f.net ?? 0), 0);
    const breakSum = attended.reduce((s, f) => s + f.r.breakMin, 0);
    return {
      employees: new Set(scope.map((r) => r.employeeId)).size,
      netSum,
      avgNet: attended.length ? Math.round(netSum / attended.length) : 0,
      breakSum,
      avgBreak: attended.length ? Math.round(breakSum / attended.length) : 0,
    };
  }, [filtered]);

  // Trend: the selected person's net hours per day, or the average per
  // attended person per day across the table.
  const trend = useMemo(() => {
    const byDate = new Map<string, { total: number; count: number }>();
    const source = filtered.map((f) => f.r);
    for (const r of source) {
      if (!r.checkIn || r.workingMin === null) continue;
      const entry = byDate.get(r.date) ?? { total: 0, count: 0 };
      entry.total += r.workingMin;
      entry.count += 1;
      byDate.set(r.date, entry);
    }
    return Array.from(byDate.entries())
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([date, e]) => {
        const minutes = Math.round(e.total / e.count);
        return { label: shortDay(date), value: minutes, title: `${formatDay(date)} - ${fmtHm(minutes)}` };
      });
  }, [filtered]);

  // Break analysis for the same scope as the trend.
  // Only completed days (checked out) count, so today's shift in progress
  // doesn't inflate the totals before its hours are known.
  const breakScope = filtered.map((f) => f.r).filter((r) => r.checkIn && r.checkOut);
  const breakTotal = breakScope.reduce((s, r) => s + r.breakMin, 0);
  const breakDays = breakScope.length;


  const cards = [
    { label: "Total Employees", value: summary.employees },
    { label: "Total working hours (net)", value: fmtHours(summary.netSum) },
    { label: "Average working hours", value: fmtHm(summary.avgNet || null) },
    { label: "Total break hours", value: fmtHours(summary.breakSum) },
    { label: "Average break", value: fmtHm(summary.avgBreak || null) },
  ];

  const header = (key: SortKey, label: string) => (
    <th style={{ cursor: "pointer", userSelect: "none" }} onClick={() => toggleSort(key)} aria-sort={sortKey === key ? (sortDir === "asc" ? "ascending" : "descending") : "none"}>
      {label}
      {sortKey === key ? (sortDir === "asc" ? " ▲" : " ▼") : ""}
    </th>
  );

  return (
    <div>
      <div className={styles.statGrid}>
        {cards.map((c) => (
          <div key={c.label} className={styles.statCard}>
            <span className={styles.statValue}>{c.value}</span>
            <span className={styles.statLabel}>{c.label}</span>
          </div>
        ))}
      </div>

      <div className={styles.toolbar}>
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Search employee or ID..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select className={styles.filterSelect} value={department} onChange={(e) => setDepartment(e.target.value)} aria-label="Filter by department">
          <option value="">All departments</option>
          {departments.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              {header("name", "Employee")}
              {header("department", "Department")}
              {header("date", "Date")}
              <th>Check-in</th>
              <th>Check-out</th>
              {header("gross", "Working hours")}
              {header("break", "Break")}
              {header("net", "Net hours")}
              {header("status", "Status")}
            </tr>
          </thead>
          <tbody>
            {sorted.map(({ r, status, gross, net }) => (
              <tr key={`${r.employeeId}-${r.date}`}>
                <td style={{ fontWeight: 600 }}>{r.name}</td>
                <td>{r.department}</td>
                <td>{formatDay(r.date)}</td>
                <td>{r.checkIn ?? "-"}</td>
                <td>{r.checkOut ?? (r.checkIn ? "-" : "-")}</td>
                <td>{fmtHm(gross)}</td>
                <td>{r.checkIn ? `${r.breakMin}m` : "-"}</td>
                <td>{fmtHm(net)}</td>
                <td>
                  <span className={toneClass(styles, STATUS_TONE[status])}>{status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {sorted.length === 0 && <div className={styles.empty}>No timesheet records for this period.</div>}
      </div>
      <p className={styles.hint} style={{ marginTop: 8 }}>
        Period {formatDay(periodFrom)} to {formatDay(periodTo)}. Leave days and weekends are not counted.
      </p>

      <div className={styles.tableWrap} style={{ padding: 16, marginTop: 18 }}>
        <h3 style={{ fontSize: 13, fontWeight: 700, margin: "0 0 4px" }}>
          Daily working hours (average per person)
        </h3>
        <p className={styles.hint} style={{ marginBottom: 12 }}>Hover a bar for the exact value.</p>
        <Bars items={trend} />
      </div>

      <div className={styles.tableWrap} style={{ padding: 16, marginTop: 18 }}>
        <h3 style={{ fontSize: 13, fontWeight: 700, margin: "0 0 12px" }}>Break analysis</h3>
        <div className={styles.statGrid} style={{ marginBottom: 12 }}>
          <div className={styles.statCard}>
            <span className={styles.statValue}>{fmtHours(breakTotal)}</span>
            <span className={styles.statLabel}>Total break</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statValue}>{fmtHm(breakDays ? Math.round(breakTotal / breakDays) : null)}</span>
            <span className={styles.statLabel}>Average break per day</span>
          </div>
        </div>
      </div>

    </div>
  );
}
