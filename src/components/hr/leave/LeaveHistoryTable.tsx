"use client";

import { useMemo, useState } from "react";
import type { EmployeeOverview } from "@/types/hr";
import type { LeaveRequest, LeaveRequestStatus } from "@/types/employee";
import Pager from "@/components/employee/Pager";
import styles from "./Leave.module.css";

const PAGE_SIZE = 10;

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

interface LeaveHistoryTableProps {
  requests: LeaveRequest[];
  employees: EmployeeOverview[];
}

// Decided requests only (Approved/Rejected) - the Pending queue lives on
// the Leave Requests tab.
export default function LeaveHistoryTable({ requests, employees }: LeaveHistoryTableProps) {
  const [statusFilter, setStatusFilter] = useState<"Approved" | "Rejected" | "All">("All");
  const [page, setPage] = useState(0);

  const employeesById = useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees]);

  const decided = useMemo(
    () =>
      requests
        .filter((r): r is LeaveRequest & { status: "Approved" | "Rejected" } => r.status !== "Pending")
        .sort((a, b) => ((a.decidedAt ?? a.submittedAt) < (b.decidedAt ?? b.submittedAt) ? 1 : -1)),
    [requests],
  );

  const filtered = statusFilter === "All" ? decided : decided.filter((r) => r.status === statusFilter);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRequests = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  function setFilter(next: LeaveRequestStatus | "All") {
    setStatusFilter(next as "Approved" | "Rejected" | "All");
    setPage(0);
  }

  return (
    <div>
      <div className={styles.filterRow}>
        <button
          type="button"
          className={`${styles.filterButton} ${statusFilter === "All" ? styles.filterButtonActive : ""}`}
          onClick={() => setFilter("All")}
        >
          All ({decided.length})
        </button>
        <button
          type="button"
          className={`${styles.filterButton} ${statusFilter === "Approved" ? styles.filterButtonActive : ""}`}
          onClick={() => setFilter("Approved")}
        >
          Approved ({decided.filter((r) => r.status === "Approved").length})
        </button>
        <button
          type="button"
          className={`${styles.filterButton} ${statusFilter === "Rejected" ? styles.filterButtonActive : ""}`}
          onClick={() => setFilter("Rejected")}
        >
          Rejected ({decided.filter((r) => r.status === "Rejected").length})
        </button>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Employee</th>
              <th>Department</th>
              <th>Type</th>
              <th>Dates</th>
              <th>Status</th>
              <th>Decided by</th>
              <th>Note</th>
            </tr>
          </thead>
          <tbody>
            {pageRequests.map((req) => (
              <tr key={req.id}>
                <td className={styles.strong}>{req.employeeName}</td>
                <td className={styles.muted}>{employeesById.get(req.employeeId)?.department ?? "-"}</td>
                <td>{req.category}</td>
                <td className={styles.muted}>
                  {formatDate(req.startDate)}
                  {req.endDate !== req.startDate ? ` – ${formatDate(req.endDate)}` : ""}
                </td>
                <td>
                  <span className={`${styles.badge} ${styles[req.status === "Approved" ? "badge-approved" : "badge-rejected"]}`}>
                    {req.status}
                  </span>
                </td>
                <td className={styles.muted}>{req.decidedBy ?? "-"}</td>
                <td className={styles.muted}>{req.decisionNote ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {pageRequests.length === 0 && <div className={styles.empty}>No decided requests in this view.</div>}
      </div>
      <Pager page={page} totalPages={totalPages} onChange={setPage} />
    </div>
  );
}
