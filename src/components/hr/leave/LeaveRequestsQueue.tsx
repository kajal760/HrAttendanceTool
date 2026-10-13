"use client";

import { useMemo, useState } from "react";
import type { EmployeeOverview } from "@/types/hr";
import type { LeaveRequest, LeaveRequestStatus } from "@/types/employee";
import Pager from "@/components/employee/Pager";
import styles from "./Leave.module.css";

const PAGE_SIZE = 8;
const STATUS_FILTERS: LeaveRequestStatus[] = ["Pending", "Approved", "Rejected"];

const BADGE_CLASS: Record<LeaveRequestStatus, string> = {
  Pending: "badge-pending",
  Approved: "badge-approved",
  Rejected: "badge-rejected",
};

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

interface LeaveRequestsQueueProps {
  requests: LeaveRequest[];
  employees: EmployeeOverview[];
}

// Approval queue - Pending requests first, then everything else. Approve is
// one click; Reject opens an inline note field (required, so there's always
// a reason the employee can see on their own History).
export default function LeaveRequestsQueue({ requests: initial, employees }: LeaveRequestsQueueProps) {
  const [requests, setRequests] = useState<LeaveRequest[]>(initial);
  const [statusFilter, setStatusFilter] = useState<LeaveRequestStatus | "All">("Pending");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [page, setPage] = useState(0);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const employeesById = useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees]);
  const departments = useMemo(
    () => Array.from(new Set(employees.map((e) => e.department))).sort(),
    [employees],
  );

  const sorted = useMemo(
    () =>
      [...requests].sort((a, b) => {
        if (a.status === "Pending" && b.status !== "Pending") return -1;
        if (a.status !== "Pending" && b.status === "Pending") return 1;
        return a.submittedAt < b.submittedAt ? 1 : -1;
      }),
    [requests],
  );

  const filtered = useMemo(
    () =>
      sorted.filter((r) => {
        if (statusFilter !== "All" && r.status !== statusFilter) return false;
        if (departmentFilter && employeesById.get(r.employeeId)?.department !== departmentFilter) return false;
        return true;
      }),
    [sorted, statusFilter, departmentFilter, employeesById],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRequests = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  function changeFilter(fn: () => void) {
    fn();
    setPage(0);
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
        <button
          type="button"
          className={`${styles.filterButton} ${statusFilter === "All" ? styles.filterButtonActive : ""}`}
          onClick={() => changeFilter(() => setStatusFilter("All"))}
        >
          All ({requests.length})
        </button>
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            type="button"
            className={`${styles.filterButton} ${statusFilter === s ? styles.filterButtonActive : ""}`}
            onClick={() => changeFilter(() => setStatusFilter(s))}
          >
            {s} ({requests.filter((r) => r.status === s).length})
          </button>
        ))}
        <select
          className={styles.departmentSelect}
          value={departmentFilter}
          onChange={(e) => changeFilter(() => setDepartmentFilter(e.target.value))}
        >
          <option value="">All departments</option>
          {departments.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      {pageRequests.length === 0 ? (
        <p className={styles.empty}>No leave requests in this view.</p>
      ) : (
        <div className={styles.list}>
          {pageRequests.map((req) => {
            const emp = employeesById.get(req.employeeId);
            const isRejecting = rejectingId === req.id;
            return (
              <div className={styles.row} key={req.id}>
                <div className={styles.rowMain}>
                  <span className={styles.name}>{req.employeeName}</span>
                  <span className={styles.meta}>
                    {emp?.department ?? "-"} &middot; {req.category}
                  </span>
                  <span className={styles.meta}>
                    {formatDate(req.startDate)}
                    {req.endDate !== req.startDate ? ` – ${formatDate(req.endDate)}` : ""} &middot; {req.days} day
                    {req.days === 1 ? "" : "s"}
                  </span>
                  <p className={styles.reason}>{req.reason}</p>
                  {req.decisionNote && (
                    <p className={styles.decisionNote}>
                      <strong>{req.status === "Approved" ? "Note" : "Reason"}:</strong> {req.decisionNote}
                    </p>
                  )}
                </div>
                <div className={styles.rowActions}>
                  <span className={`${styles.badge} ${styles[BADGE_CLASS[req.status]]}`}>{req.status}</span>
                  {req.status === "Pending" && (
                    <>
                      <button
                        type="button"
                        className={styles.approveButton}
                        disabled={busyId === req.id}
                        onClick={() => decide(req.id, "Approved")}
                      >
                        Approve
                      </button>
                      {isRejecting ? (
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
                              Confirm reject
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
                        <button
                          type="button"
                          className={styles.rejectButton}
                          disabled={busyId === req.id}
                          onClick={() => setRejectingId(req.id)}
                        >
                          Reject
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Pager page={page} totalPages={totalPages} onChange={setPage} />
    </div>
  );
}
