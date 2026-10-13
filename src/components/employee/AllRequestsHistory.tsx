"use client";

import { useEffect, useMemo, useState } from "react";
import type { AssetRequest, HrRequest, LeaveRequest } from "@/types/employee";
import Pager from "./Pager";
import styles from "./AllRequestsHistory.module.css";

const PAGE_SIZE = 5;

const ASSET_KEY = "hr-attendance:asset-requests:v1";
const HR_KEY = "hr-attendance:hr-requests:v1";

type RequestKind = "Leave" | "Assets" | "WFH" | "Other";
type RequestRowStatus = "Pending" | "Approved" | "Rejected";

interface UnifiedRow {
  id: string;
  kind: RequestKind;
  type: string;
  summary: string;
  status: RequestRowStatus;
  submittedAt: string;
}

const KIND_FILTERS: RequestKind[] = ["Leave", "Assets", "WFH", "Other"];

const BADGE_CLASS: Record<RequestRowStatus, string> = {
  Pending: "badge-pending",
  Approved: "badge-approved",
  Rejected: "badge-rejected",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function readStorage<T>(key: string, fallback: T[]): T[] {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : fallback;
  } catch {
    return fallback;
  }
}

// The generic HR Requests form has its own "Leave"/"Work From Home"
// categories too (distinct from the dedicated Leave module) - bucket those
// into the same filters a user would expect, rather than lumping every
// HR Request under "Other".
function hrRequestKind(category: HrRequest["category"]): RequestKind {
  if (category === "Leave") return "Leave";
  if (category === "Work From Home") return "WFH";
  return "Other";
}

interface AllRequestsHistoryProps {
  leaveRequests: LeaveRequest[];
  initialAssetRequests: AssetRequest[];
  initialHrRequests: HrRequest[];
}

// A single filterable, paginated history across every kind of request an
// employee can raise in this app - each kind is still submitted and stored
// through its own dedicated flow (Leave, Assets, the generic HR Requests
// form); this view only reads and merges them for one combined history.
// Leave is server-fetched (real leave-store, passed in as a prop) - Assets
// and the generic HR Requests form are still localStorage-only, so those
// two are still read directly here.
export default function AllRequestsHistory({
  leaveRequests,
  initialAssetRequests,
  initialHrRequests,
}: AllRequestsHistoryProps) {
  const [rows, setRows] = useState<UnifiedRow[]>([]);
  const [filter, setFilter] = useState<RequestKind | "All">("All");
  const [page, setPage] = useState(0);

  useEffect(() => {
    const assets = readStorage(ASSET_KEY, initialAssetRequests);
    const hr = readStorage(HR_KEY, initialHrRequests);

    const merged: UnifiedRow[] = [
      ...leaveRequests.map((r): UnifiedRow => ({
        id: r.id,
        kind: "Leave",
        type: r.category,
        summary: r.reason,
        status: r.status,
        submittedAt: r.submittedAt,
      })),
      ...assets.map((r): UnifiedRow => ({
        id: r.id,
        kind: "Assets",
        type: r.type,
        summary: r.note,
        status: r.status,
        submittedAt: r.submittedAt,
      })),
      ...hr.map((r): UnifiedRow => ({
        id: r.id,
        kind: hrRequestKind(r.category),
        type: r.category === "Other" ? r.otherLabel || "Other" : r.category,
        summary: r.summary,
        status: r.status,
        submittedAt: r.submittedAt,
      })),
    ];
    merged.sort((a, b) => (a.submittedAt < b.submittedAt ? 1 : -1));
    setRows(merged);
    // Assets/HR storage only needs reading on mount (each source page owns
    // writing to its own key); leaveRequests is a real server-fetched prop,
    // so it's a legitimate dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leaveRequests]);

  const counts = useMemo(() => {
    const c: Record<RequestKind, number> = { Leave: 0, Assets: 0, WFH: 0, Other: 0 };
    for (const row of rows) c[row.kind] += 1;
    return c;
  }, [rows]);

  const filtered = filter === "All" ? rows : rows.filter((row) => row.kind === filter);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  function changeFilter(next: RequestKind | "All") {
    setFilter(next);
    setPage(0);
  }

  return (
    <div>
      <div className={styles.filterRow}>
        <button
          type="button"
          className={`${styles.filterButton} ${filter === "All" ? styles.filterButtonActive : ""}`}
          onClick={() => changeFilter("All")}
        >
          All ({rows.length})
        </button>
        {KIND_FILTERS.map((kind) => (
          <button
            key={kind}
            type="button"
            className={`${styles.filterButton} ${filter === kind ? styles.filterButtonActive : ""}`}
            onClick={() => changeFilter(kind)}
          >
            {kind} ({counts[kind]})
          </button>
        ))}
      </div>

      {pageRows.length === 0 ? (
        <p className={styles.empty}>No requests in this view.</p>
      ) : (
        <>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Kind</th>
                <th>Type</th>
                <th>Summary</th>
                <th>Status</th>
                <th>Submitted</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row) => (
                <tr key={`${row.kind}-${row.id}`}>
                  <td>{row.kind}</td>
                  <td className={styles.muted}>{row.type}</td>
                  <td className={styles.summaryCell}>{row.summary}</td>
                  <td>
                    <span className={`${styles.badge} ${styles[BADGE_CLASS[row.status]]}`}>{row.status}</span>
                  </td>
                  <td className={styles.muted}>{formatDate(row.submittedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pager page={page} totalPages={totalPages} onChange={setPage} />
        </>
      )}
    </div>
  );
}
