"use client";

import { useEffect, useMemo, useState } from "react";
import {
  FileText,
  Clock,
  CheckCircle2,
  PauseCircle,
  ArrowUp,
  ArrowDown,
  ArrowRight,
  Download,
  X,
  type LucideIcon,
} from "lucide-react";
import type { PoshComplaint, PoshComplaintStatus } from "@/types/posh";
import { toneClass, type BadgeTone } from "./lifecycle/badge-tones";
import AssetStatusDonut from "./assets/AssetStatusDonut";
import PoshTrendChart from "./PoshTrendChart";
import Pager from "@/components/employee/Pager";
import lifecycleStyles from "./lifecycle/Lifecycle.module.css";
import formStyles from "./FormModal.module.css";
import styles from "./PoshOverview.module.css";

const PAGE_SIZE = 5;

type DisplayStatus = "Needs Attention" | "Under Investigation" | "Resolved";
type StatKey = "total" | "needsAttention" | "resolved" | "underInvestigation";

const STATUS_LABEL: Record<PoshComplaintStatus, DisplayStatus> = {
  Submitted: "Needs Attention",
  "Under Review": "Under Investigation",
  Resolved: "Resolved",
};

// "blue" maps to --color-info, which is this theme's indigo/purple tone -
// the closest existing badge tone to "Under Investigation" without adding a
// new color to the shared Lifecycle palette.
const STATUS_TONE: Record<PoshComplaintStatus, BadgeTone> = {
  Submitted: "amber",
  "Under Review": "blue",
  Resolved: "green",
};

const PERIOD_OPTIONS: { key: string; label: string; months: number | null }[] = [
  { key: "3", label: "Last 3 Months", months: 3 },
  { key: "6", label: "Last 6 Months", months: 6 },
  { key: "12", label: "Last 12 Months", months: 12 },
  { key: "all", label: "All Time", months: null },
];

const TABS: { key: DisplayStatus | "All"; label: string }[] = [
  { key: "All", label: "All Cases" },
  { key: "Needs Attention", label: "Needs Attention" },
  { key: "Under Investigation", label: "Under Investigation" },
  { key: "Resolved", label: "Resolved" },
];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function formatDateTime(iso: string): string {
  const time = new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  return `${formatDate(iso)}, ${time}`;
}

function monthsAgo(from: Date, n: number): Date {
  const d = new Date(from);
  d.setMonth(d.getMonth() - n);
  return d;
}

function monthKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "short" });
}

function toCsv(rows: PoshComplaint[]): string {
  const header = ["Complaint ID", "Date of Complaint", "Complainant", "Status", "Assigned To", "Last Updated"].join(",");
  const escape = (v: unknown) => {
    const s = v === undefined || v === null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = rows.map((c) =>
    [c.id, c.submittedAt, c.anonymous ? "Anonymous" : c.employeeName ?? "Unknown", STATUS_LABEL[c.status], c.resolvedBy ?? "", c.resolvedAt ?? c.submittedAt]
      .map(escape)
      .join(","),
  );
  return [header, ...lines].join("\n");
}

// Status colors feed a <canvas> chart, so they need resolved values, not
// unresolved `var(--...)` strings - same reasoning as useChartTheme, just
// for the three tones this page needs instead of the series palette.
function useStatusColors() {
  const FALLBACK = { warning: "#b96b00", success: "#1a8a4a", info: "#4a3aa7" };
  const [colors, setColors] = useState(FALLBACK);

  useEffect(() => {
    function read() {
      const style = getComputedStyle(document.documentElement);
      const v = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback;
      setColors({
        warning: v("--color-warning", FALLBACK.warning),
        success: v("--color-success", FALLBACK.success),
        info: v("--color-info", FALLBACK.info),
      });
    }
    read();
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", read);
    return () => mq.removeEventListener("change", read);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return colors;
}

interface PoshOverviewProps {
  complaints: PoshComplaint[];
  readOnly: boolean;
}

export default function PoshOverview({ complaints: initial, readOnly }: PoshOverviewProps) {
  const [complaints, setComplaints] = useState<PoshComplaint[]>(initial);
  const [periodKey, setPeriodKey] = useState("6");
  const [tab, setTab] = useState<DisplayStatus | "All">("All");
  const [page, setPage] = useState(0);
  const [detail, setDetail] = useState<PoshComplaint | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const statusColors = useStatusColors();

  const period = PERIOD_OPTIONS.find((p) => p.key === periodKey) ?? PERIOD_OPTIONS[1];

  const { current, previous } = useMemo(() => {
    if (period.months === null) return { current: complaints, previous: [] as PoshComplaint[] };
    const now = new Date();
    const start = monthsAgo(now, period.months);
    const prevStart = monthsAgo(start, period.months);
    return {
      current: complaints.filter((c) => new Date(c.submittedAt) >= start),
      previous: complaints.filter((c) => {
        const d = new Date(c.submittedAt);
        return d >= prevStart && d < start;
      }),
    };
  }, [complaints, period.months]);

  function countByStatus(rows: PoshComplaint[], status: PoshComplaintStatus): number {
    return rows.filter((c) => c.status === status).length;
  }

  const stats: Record<StatKey, number> = useMemo(
    () => ({
      total: current.length,
      needsAttention: countByStatus(current, "Submitted"),
      resolved: countByStatus(current, "Resolved"),
      underInvestigation: countByStatus(current, "Under Review"),
    }),
    [current],
  );

  const prevStats: Record<StatKey, number> = useMemo(
    () => ({
      total: previous.length,
      needsAttention: countByStatus(previous, "Submitted"),
      resolved: countByStatus(previous, "Resolved"),
      underInvestigation: countByStatus(previous, "Under Review"),
    }),
    [previous],
  );

  const donutData = useMemo(
    () => [
      { label: "Needs Attention", value: stats.needsAttention, color: statusColors.warning },
      { label: "Under Investigation", value: stats.underInvestigation, color: statusColors.info },
      { label: "Resolved", value: stats.resolved, color: statusColors.success },
    ],
    [stats, statusColors],
  );

  const trendData = useMemo(() => {
    const months = period.months ?? 12;
    const now = new Date();
    const keys: string[] = [];
    for (let i = months - 1; i >= 0; i--) keys.push(monthKey(monthsAgo(now, i).toISOString()));
    return keys.map((key) => ({
      label: monthLabel(key),
      total: complaints.filter((c) => monthKey(c.submittedAt) === key).length,
      resolved: complaints.filter((c) => c.resolvedAt && monthKey(c.resolvedAt) === key).length,
    }));
  }, [complaints, period.months]);

  const byTab = useMemo(
    () => (tab === "All" ? current : current.filter((c) => STATUS_LABEL[c.status] === tab)),
    [current, tab],
  );

  const totalPages = Math.max(1, Math.ceil(byTab.length / PAGE_SIZE));
  const pageRows = byTab.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  function changeTab(next: DisplayStatus | "All") {
    setTab(next);
    setPage(0);
  }

  function exportCsv() {
    const filename = `posh-complaints-${new Date().toISOString().slice(0, 10)}.csv`;
    const csv = toCsv(byTab);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function setStatus(id: string, status: PoshComplaintStatus) {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/superadmin/posh/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not update this complaint.");
        return;
      }
      setComplaints((prev) => prev.map((c) => (c.id === id ? data.complaint : c)));
      setDetail((d) => (d && d.id === id ? data.complaint : d));
    } finally {
      setBusyId(null);
    }
  }

  function delta(key: StatKey): { diff: number; icon: LucideIcon; tone: string } {
    const diff = stats[key] - prevStats[key];
    if (diff > 0) return { diff, icon: ArrowUp, tone: styles.deltaUp };
    if (diff < 0) return { diff, icon: ArrowDown, tone: styles.deltaDown };
    return { diff: 0, icon: ArrowRight, tone: styles.deltaFlat };
  }

  function deltaLabel(diff: number): string {
    if (diff > 0) return `+${diff} vs last period`;
    if (diff < 0) return `${diff} vs last period`;
    return "0 vs last period";
  }

  const cards: { key: StatKey; label: string; icon: LucideIcon; variant: string }[] = [
    { key: "total", label: "Total Complaints", icon: FileText, variant: styles.statCardBlue },
    { key: "needsAttention", label: "Needs Attention", icon: Clock, variant: styles.statCardOrange },
    { key: "resolved", label: "Resolved", icon: CheckCircle2, variant: styles.statCardGreen },
    { key: "underInvestigation", label: "Under Investigation", icon: PauseCircle, variant: styles.statCardPurple },
  ];

  return (
    <div>
      <div className={styles.headerRow}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 4px" }}>POSH Management</h1>
          <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: 0 }}>
            Track and manage POSH complaints with care and confidentiality
          </p>
        </div>
        <select
          className={styles.periodSelect}
          value={periodKey}
          onChange={(e) => {
            setPeriodKey(e.target.value);
            setPage(0);
          }}
          aria-label="Period"
        >
          {PERIOD_OPTIONS.map((p) => (
            <option key={p.key} value={p.key}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.statGrid}>
        {cards.map((c) => {
          const d = delta(c.key);
          const DeltaIcon = d.icon;
          const Icon = c.icon;
          return (
            <div key={c.key} className={`${styles.statCard} ${c.variant}`}>
              <span className={styles.statIcon}>
                <Icon size={20} strokeWidth={2.25} />
              </span>
              <div className={styles.statBody}>
                <span className={styles.statValue}>{stats[c.key]}</span>
                <span className={styles.statLabel}>{c.label}</span>
                {period.months !== null && (
                  <span className={`${styles.statDelta} ${d.tone}`}>
                    <DeltaIcon size={12} strokeWidth={2.5} />
                    {deltaLabel(d.diff)}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className={styles.panelsGrid}>
        <div className={styles.panel}>
          <h3 className={styles.panelTitle}>Case Status Overview</h3>
          <AssetStatusDonut data={donutData} />
        </div>
        <div className={styles.panel}>
          <h3 className={styles.panelTitle}>Complaint Trend</h3>
          <PoshTrendChart data={trendData} />
        </div>
      </div>

      {error && <p style={{ fontSize: 12, color: "var(--color-danger)", margin: "0 0 10px" }}>{error}</p>}

      <div className={styles.tabsRow}>
        <div className={styles.tabStrip}>
          {TABS.map((t) => {
            const count = t.key === "All" ? current.length : current.filter((c) => STATUS_LABEL[c.status] === t.key).length;
            return (
              <button
                key={t.key}
                type="button"
                className={`${styles.tab} ${tab === t.key ? styles.tabActive : ""}`}
                onClick={() => changeTab(t.key)}
              >
                {t.label} ({count})
              </button>
            );
          })}
        </div>
        <button type="button" className={lifecycleStyles.actionButton} onClick={exportCsv}>
          <Download size={13} strokeWidth={2.25} style={{ marginRight: 4, verticalAlign: -2 }} />
          Export Report
        </button>
      </div>

      <div className={lifecycleStyles.tableWrap}>
        <table className={lifecycleStyles.table}>
          <thead>
            <tr>
              <th>Complaint ID</th>
              <th>Date of Complaint</th>
              <th>Complainant</th>
              <th>Status</th>
              <th>Assigned To</th>
              <th>Last Updated</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((c) => (
              <tr key={c.id}>
                <td style={{ fontWeight: 600 }}>{c.id}</td>
                <td className={lifecycleStyles.muted}>{formatDate(c.submittedAt)}</td>
                <td>{c.anonymous ? "Anonymous" : c.employeeName ?? "Unknown"}</td>
                <td>
                  <span className={toneClass(lifecycleStyles, STATUS_TONE[c.status])}>{STATUS_LABEL[c.status]}</span>
                </td>
                <td className={lifecycleStyles.muted}>{c.resolvedBy ?? "—"}</td>
                <td className={lifecycleStyles.muted}>{formatDateTime(c.resolvedAt ?? c.submittedAt)}</td>
                <td>
                  <button type="button" className={lifecycleStyles.actionButton} onClick={() => setDetail(c)}>
                    View Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {pageRows.length === 0 && (
          <div className={lifecycleStyles.empty}>
            {current.length === 0 ? "No complaints in this period." : "No complaints match this view."}
          </div>
        )}
      </div>
      {byTab.length > 0 && (
        <p className={styles.resultCount}>
          Showing {page * PAGE_SIZE + 1}–{Math.min(byTab.length, page * PAGE_SIZE + PAGE_SIZE)} of {byTab.length} cases
        </p>
      )}
      <Pager page={page} totalPages={totalPages} onChange={setPage} />

      {detail && (
        <div className={formStyles.overlay} onMouseDown={(e) => e.target === e.currentTarget && setDetail(null)}>
          <div className={formStyles.panel} role="dialog" aria-modal="true" aria-label="Complaint details">
            <div className={formStyles.panelHeader}>
              <h2 className={formStyles.title}>{detail.id}</h2>
              <button type="button" className={formStyles.closeButton} onClick={() => setDetail(null)} aria-label="Close">
                <X size={16} />
              </button>
            </div>
            <div className={lifecycleStyles.factGrid}>
              <div className={lifecycleStyles.fact}>
                <span className={lifecycleStyles.factLabel}>Complainant</span>
                <span className={lifecycleStyles.factValue}>{detail.anonymous ? "Anonymous" : detail.employeeName ?? "Unknown"}</span>
              </div>
              <div className={lifecycleStyles.fact}>
                <span className={lifecycleStyles.factLabel}>Filed</span>
                <span className={lifecycleStyles.factValue}>{formatDateTime(detail.submittedAt)}</span>
              </div>
              {detail.respondent && (
                <div className={lifecycleStyles.fact}>
                  <span className={lifecycleStyles.factLabel}>Concerning</span>
                  <span className={lifecycleStyles.factValue}>{detail.respondent}</span>
                </div>
              )}
              <div className={lifecycleStyles.fact}>
                <span className={lifecycleStyles.factLabel}>Status</span>
                <span className={toneClass(lifecycleStyles, STATUS_TONE[detail.status])}>{STATUS_LABEL[detail.status]}</span>
              </div>
              <div className={lifecycleStyles.fact} style={{ gridColumn: "1 / -1" }}>
                <span className={lifecycleStyles.factLabel}>Description</span>
                <span className={lifecycleStyles.factValue}>{detail.description}</span>
              </div>
              {detail.resolutionNote && (
                <div className={lifecycleStyles.fact} style={{ gridColumn: "1 / -1" }}>
                  <span className={lifecycleStyles.factLabel}>Resolution</span>
                  <span className={lifecycleStyles.factValue}>{detail.resolutionNote}</span>
                </div>
              )}
            </div>
            {!readOnly && detail.status !== "Resolved" && (
              <div className={formStyles.actions} style={{ marginTop: 14 }}>
                {detail.status === "Submitted" && (
                  <button
                    type="button"
                    className={formStyles.saveButton}
                    disabled={busyId === detail.id}
                    onClick={() => setStatus(detail.id, "Under Review")}
                  >
                    Start review
                  </button>
                )}
                {detail.status === "Under Review" && (
                  <button
                    type="button"
                    className={formStyles.saveButton}
                    disabled={busyId === detail.id}
                    onClick={() => setStatus(detail.id, "Resolved")}
                  >
                    Mark resolved
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
