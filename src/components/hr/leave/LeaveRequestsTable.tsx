"use client";

import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import type { EmployeeOverview } from "@/types/hr";
import type { LeaveRequest, LeaveRequestStatus } from "@/types/employee";
import Pager from "@/components/employee/Pager";
import styles from "./Leave.module.css";

const PAGE_SIZE = 8;
const TABS: { key: LeaveRequestStatus | "All"; label: string }[] = [
  { key: "Pending", label: "Pending" },
  { key: "Approved", label: "Approved" },
  { key: "Rejected", label: "Rejected" },
  { key: "All", label: "All Requests" },
];

const BADGE_CLASS: Record<LeaveRequestStatus, string> = {
  Pending: "badge-pending",
  Approved: "badge-approved",
  Rejected: "badge-rejected",
  Cancelled: "badge-cancelled",
};

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function toCsv(rows: LeaveRequest[], employeesById: Map<string, EmployeeOverview>): string {
  const header = ["Employee", "Department", "Leave Type", "Start", "End", "Days", "Reason", "Status", "Submitted"].join(",");
  const escape = (v: unknown) => {
    const s = v === undefined || v === null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = rows.map((r) =>
    [
      r.employeeName,
      employeesById.get(r.employeeId)?.department ?? "",
      r.category,
      r.startDate,
      r.endDate,
      r.days,
      r.reason,
      r.status,
      r.submittedAt,
    ]
      .map(escape)
      .join(","),
  );
  return [header, ...lines].join("\n");
}

interface LeaveRequestsTableProps {
  requests: LeaveRequest[];
  employees: EmployeeOverview[];
}

// Single table covering every leave request - Pending/Approved/Rejected/All
// Requests tabs (counts in parens, like the mockup), a department filter, a
// CSV export, and inline Approve/Reject for anything still Pending. Replaces
// the old split between a card-based Pending queue and a separate decided-
// only History page.
export default function LeaveRequestsTable({ requests: initial, employees }: LeaveRequestsTableProps) {
  const [requests, setRequests] = useState<LeaveRequest[]>(initial);
  const [tab, setTab] = useState<LeaveRequestStatus | "All">("Pending");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [showFilter, setShowFilter] = useState(false);
  const [page, setPage] = useState(0);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const employeesById = useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees]);
  const departments = useMemo(() => Array.from(new Set(employees.map((e) => e.department))).sort(), [employees]);

  const sorted = useMemo(
    () =>
      [...requests].sort((a, b) => {
        if (a.status === "Pending" && b.status !== "Pending") return -1;
        if (a.status !== "Pending" && b.status === "Pending") return 1;
        return a.submittedAt < b.submittedAt ? 1 : -1;
      }),
    [requests],
  );

  const byTab = useMemo(
    () => (tab === "All" ? sorted : sorted.filter((r) => r.status === tab)),
    [sorted, tab],
  );

  const filtered = useMemo(
    () => byTab.filter((r) => !departmentFilter || employeesById.get(r.employeeId)?.department === departmentFilter),
    [byTab, departmentFilter, employeesById],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRequests = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  function changeTab(next: LeaveRequestStatus | "All") {
    setTab(next);
    setPage(0);
  }

  function exportCsv() {
    const filename = `leave-requests-${new Date().toISOString().slice(0, 10)}.csv`;
    const csv = toCsv(filtered, employeesById);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function decide(id: string, status: "Approved" | "Rejected", decisionNote?: string) {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/superadmin/leave/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, note: decisionNote }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not update this request.");
        return;
      }
      setRequests((prev) => prev.map((r) => (r.id === id ? data.request : r)));
      setRejectingId(null);
      setNote("");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className={styles.filterRow}>
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            className={`${styles.filterButton} ${tab === t.key ? styles.filterButtonActive : ""}`}
            onClick={() => changeTab(t.key)}
          >
            {t.label} ({t.key === "All" ? requests.length : requests.filter((r) => r.status === t.key).length})
          </button>
        ))}
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button type="button" className={styles.cancelButton} onClick={() => setShowFilter((v) => !v)}>
            Filter
          </button>
          <button type="button" className={styles.cancelButton} onClick={exportCsv}>
            <Download size={13} strokeWidth={2.25} /> Export
          </button>
        </div>
      </div>

      {showFilter && (
        <div className={styles.filterRow}>
          <select
            className={styles.departmentSelect}
            style={{ marginLeft: 0 }}
            value={departmentFilter}
            onChange={(e) => {
              setDepartmentFilter(e.target.value);
              setPage(0);
            }}
          >
            <option value="">All departments</option>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
      )}

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Employee</th>
              <th>Leave Type</th>
              <th>Period</th>
              <th>Days</th>
              <th>Reason</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pageRequests.map((req) => {
              const emp = employeesById.get(req.employeeId);
              const isRejecting = rejectingId === req.id;
              return (
                <tr key={req.id}>
                  <td>
                    <span className={styles.strong}>{req.employeeName}</span>
                    <div className={styles.muted}>{emp?.department ?? "-"}</div>
                  </td>
                  <td>{req.category}</td>
                  <td className={styles.muted}>
                    {formatDate(req.startDate)}
                    {req.endDate !== req.startDate ? ` – ${formatDate(req.endDate)}` : ""}
                  </td>
                  <td>{req.days}</td>
                  <td className={styles.muted} style={{ maxWidth: 200 }}>{req.reason}</td>
                  <td>
                    <span className={`${styles.badge} ${styles[BADGE_CLASS[req.status]]}`}>{req.status}</span>
                  </td>
                  <td style={{ minWidth: 150 }}>
                    {req.status === "Pending" ? (
                      isRejecting ? (
                        <div className={styles.rejectForm}>
                          <textarea
                            className={styles.rejectNote}
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="Reason for rejection..."
                            autoFocus
                          />
                          <div className={styles.rejectActions}>
                            <button
                              type="button"
                              className={styles.rejectButton}
                              disabled={busyId === req.id || note.trim().length === 0}
                              onClick={() => decide(req.id, "Rejected", note)}
                            >
                              Confirm
                            </button>
                            <button
                              type="button"
                              className={styles.cancelButton}
                              onClick={() => {
                                setRejectingId(null);
                                setNote("");
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: "flex", gap: 6 }}>
                          <button
                            type="button"
                            className={styles.approveButton}
                            disabled={busyId === req.id || (req.certificateRequired && !req.hasAttachment)}
                            title={req.certificateRequired && !req.hasAttachment ? "Waiting for the medical certificate" : undefined}
                            onClick={() => decide(req.id, "Approved")}
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            className={styles.rejectButton}
                            disabled={busyId === req.id}
                            onClick={() => setRejectingId(req.id)}
                          >
                            Reject
                          </button>
                        </div>
                      )
                    ) : (
                      <span className={styles.muted}>{req.decidedBy ?? "-"}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {pageRequests.length === 0 && <div className={styles.empty}>No leave requests in this view.</div>}
      </div>
      {filtered.length > 0 && (
        <p className={styles.muted} style={{ fontSize: 12, margin: "10px 2px 0" }}>
          Showing {page * PAGE_SIZE + 1}–{Math.min(filtered.length, page * PAGE_SIZE + PAGE_SIZE)} of {filtered.length} requests
        </p>
      )}
      <Pager page={page} totalPages={totalPages} onChange={setPage} />
    </div>
  );
}
