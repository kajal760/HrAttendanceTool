"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Download } from "lucide-react";
import { LOG_MODULES, type LogModule, type LogSeverity, type SystemLogEntry } from "@/types/log";
import { withBase } from "@/lib/portal";
import { usePortalBase } from "./usePortalBase";
import styles from "./SystemLogViewer.module.css";
import { useDepartmentNames } from "./useDepartmentNames";

const REFRESH_SECONDS = 300; // 5 minutes

const SEVERITY_OPTIONS: (LogSeverity | "All")[] = ["All", "info", "warning", "critical"];

type DateRange = "All" | "Today" | "Yesterday" | "Last 7 Days" | "Last 30 Days" | "Custom";
const DATE_RANGE_OPTIONS: DateRange[] = ["All", "Today", "Yesterday", "Last 7 Days", "Last 30 Days", "Custom"];

function formatTime(iso: string): string {
  const date = new Date(iso);
  const isToday = date.toDateString() === new Date().toDateString();
  const time = date.toLocaleTimeString("en-GB", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
  if (isToday) return time;
  const day = date.toLocaleDateString("en-GB", { month: "short", day: "numeric" });
  return `${day}, ${time}`;
}

function formatCountdown(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function inDateRange(timestamp: string, range: DateRange, customStart: string, customEnd: string): boolean {
  if (range === "All") return true;
  const d = new Date(timestamp);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (range === "Today") return d >= startOfToday;
  if (range === "Yesterday") {
    const startYesterday = new Date(startOfToday);
    startYesterday.setDate(startYesterday.getDate() - 1);
    return d >= startYesterday && d < startOfToday;
  }
  if (range === "Last 7 Days") {
    const cutoff = new Date(startOfToday);
    cutoff.setDate(cutoff.getDate() - 6);
    return d >= cutoff;
  }
  if (range === "Last 30 Days") {
    const cutoff = new Date(startOfToday);
    cutoff.setDate(cutoff.getDate() - 29);
    return d >= cutoff;
  }
  // Custom - an empty bound on either side leaves that side unrestricted.
  const afterStart = customStart ? d >= new Date(customStart) : true;
  const beforeEnd = customEnd ? d <= new Date(`${customEnd}T23:59:59`) : true;
  return afterStart && beforeEnd;
}

interface SystemLogViewerProps {
  initialLogs: SystemLogEntry[];
  initialModuleFilter?: LogModule | "All";
}

// Polls `GET /api/superadmin/logs` every 5 minutes so this page reflects
// system activity without a manual reload. "Refresh now" exists for testing
// without waiting out the interval. Which module is showing is set by the
// horizontal tabs in `HrSecondaryNav` (real links, `?module=...`) - this
// component just reads that as its initial value; the "Module" filter
// dropdown here is an independent, faster way to switch modules without a
// navigation, for whichever module you're currently looking at.
export default function SystemLogViewer({ initialLogs, initialModuleFilter = "All" }: SystemLogViewerProps) {
  const base = usePortalBase();
  const [logs, setLogs] = useState<SystemLogEntry[]>(initialLogs);
  const [lastFetchedAt, setLastFetchedAt] = useState<Date | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    setLastFetchedAt(new Date());
  }, []);
  const [secondsLeft, setSecondsLeft] = useState(REFRESH_SECONDS);
  const [refreshing, setRefreshing] = useState(false);

  const router = useRouter();
  const moduleFilter = initialModuleFilter;

  // The module comes from the URL (set by the horizontal tabs or the module
  // dropdown). The page keys this component by module, so changing module
  // remounts it and resets the refinement filters - the tab alone shows the
  // whole module, and department/event/actor/etc. then narrow it.
  function exportCsv() {
    const columns: (keyof SystemLogEntry | "actorName")[] = ["timestamp", "module", "event", "actorName", "department", "detail", "severity"];
    const escape = (v: unknown) => {
      const str = v === undefined || v === null ? "" : String(v);
      return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
    };
    const rows = filtered.map((log) =>
      columns.map((c) => escape(c === "actorName" ? log.actor.name : log[c as keyof SystemLogEntry])).join(","),
    );
    const csv = [columns.join(","), ...rows].join("\n");
    const filename = `system-log-${moduleFilter === "All" ? "all" : moduleFilter.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${new Date().toISOString().slice(0, 10)}.csv`;
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    fetch("/api/superadmin/logs/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ detail: `${filename} · ${filtered.length} rows` }),
    }).catch(() => {});
  }

  function changeModule(next: LogModule | "All") {
    router.replace(
      withBase(base, next === "All" ? "/log" : `/log?module=${encodeURIComponent(next)}`),
      { scroll: false },
    );
  }
  const [departmentFilter, setDepartmentFilter] = useState("All");
  const [eventFilter, setEventFilter] = useState("All");
  const [severityFilter, setSeverityFilter] = useState<LogSeverity | "All">("All");
  const [dateRange, setDateRange] = useState<DateRange>("All");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [query, setQuery] = useState("");

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/superadmin/logs", { cache: "no-store" });
      const data: { logs: SystemLogEntry[]; fetchedAt: string } = await res.json();
      setLogs(data.logs);
      setLastFetchedAt(new Date(data.fetchedAt));
    } catch {
      // Network hiccup - keep showing the last known logs, try again next tick.
    } finally {
      setRefreshing(false);
      setSecondsLeft(REFRESH_SECONDS);
    }
  }, []);

  // Pure 1s ticker.
  useEffect(() => {
    const id = window.setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  // Fires the actual fetch once the ticker reaches zero.
  useEffect(() => {
    if (secondsLeft === 0) refresh();
  }, [secondsLeft, refresh]);

  const departmentNames = useDepartmentNames().names;
  const departments = useMemo(
    () =>
      Array.from(new Set([...departmentNames, ...logs.map((l) => l.department).filter((d): d is string => !!d)])).sort(),
    [departmentNames, logs],
  );
  const events = useMemo(() => Array.from(new Set(logs.map((l) => l.event))).sort(), [logs]);

  const filtered = logs.filter((log) => {
    if (moduleFilter !== "All" && log.module !== moduleFilter) return false;
    if (departmentFilter !== "All" && log.department !== departmentFilter) return false;
    if (eventFilter !== "All" && log.event !== eventFilter) return false;
    if (severityFilter !== "All" && log.severity !== severityFilter) return false;
    if (!inDateRange(log.timestamp, dateRange, customStart, customEnd)) return false;
    if (query.trim()) {
      const haystack = `${log.event} ${log.actor.name} ${log.detail ?? ""}`.toLowerCase();
      if (!haystack.includes(query.trim().toLowerCase())) return false;
    }
    return true;
  });

  return (
    <div>
      <div className={styles.toolbar}>
        <span className={styles.status}>
          <span className={styles.dot} />
          Auto-refreshes every 5 minutes &middot; Last updated {mounted && lastFetchedAt ? formatTime(lastFetchedAt.toISOString()) : "—"}
          &middot; Next refresh in {formatCountdown(secondsLeft)}
        </span>
        <div className={styles.toolbarActions}>
        <button type="button" className={styles.exportButton} onClick={exportCsv} disabled={filtered.length === 0}>
          <Download size={13} strokeWidth={2.25} /> Export
        </button>
        <button
          type="button"
          className={styles.refreshButton}
          onClick={refresh}
          disabled={refreshing}
        >
          {refreshing ? "Refreshing..." : "Refresh now"}
        </button>
        </div>
      </div>

      <div className={styles.filters}>
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Search event, person, or detail..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)} aria-label="Filter by department">
          <option value="All">All departments</option>
          {departments.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
        <select value={moduleFilter} onChange={(e) => changeModule(e.target.value as LogModule | "All")} aria-label="Filter by module">
          <option value="All">All modules</option>
          {LOG_MODULES.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <select value={eventFilter} onChange={(e) => setEventFilter(e.target.value)} aria-label="Filter by event type">
          <option value="All">All event types</option>
          {events.map((ev) => (
            <option key={ev} value={ev}>{ev}</option>
          ))}
        </select>
        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value as LogSeverity | "All")}
          aria-label="Filter by severity"
        >
          {SEVERITY_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s === "All" ? "All severities" : s[0].toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>
        <select value={dateRange} onChange={(e) => setDateRange(e.target.value as DateRange)} aria-label="Filter by date range">
          {DATE_RANGE_OPTIONS.map((r) => (
            <option key={r} value={r}>{r === "All" ? "All time" : r}</option>
          ))}
        </select>
        {dateRange === "Custom" && (
          <>
            <input type="date" className={styles.dateInput} value={customStart} onChange={(e) => setCustomStart(e.target.value)} aria-label="Custom range start" />
            <input type="date" className={styles.dateInput} value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} aria-label="Custom range end" />
          </>
        )}
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Time</th>
              <th>Module</th>
              <th>Event</th>
              <th>Actor</th>
              <th>Department</th>
              <th>Detail</th>
              <th>Severity</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((log) => (
              <tr key={log.id}>
                <td className={styles.time}>{formatTime(log.timestamp)}</td>
                <td>
                  <span className={`${styles.badge} ${styles["badge-module"]}`}>
                    {log.module}
                  </span>
                </td>
                <td>{log.event}</td>
                <td>
                  <span className={styles.actorCell}>
                    <span className={styles.avatar}>{log.actor.initials}</span>
                    {log.actor.name}
                  </span>
                </td>
                <td className={styles.muted}>{log.department ?? "—"}</td>
                <td className={styles.detail}>{log.detail ?? "–"}</td>
                <td>
                  <span className={`${styles.badge} ${styles[`badge-${log.severity}`]}`}>
                    {log.severity}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className={styles.empty}>No matching events.</div>}
      </div>
    </div>
  );
}
