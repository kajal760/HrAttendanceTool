"use client";

import { useEffect, useMemo, useState } from "react";
import type { MaintenanceRecord } from "@/lib/hr/asset-maintenance";
import Pager from "@/components/employee/Pager";
import styles from "../lifecycle/Lifecycle.module.css";

const PAGE_SIZE = 10;
const STATUS_FILTERS: MaintenanceRecord["status"][] = ["In Progress", "Completed"];

function formatDate(iso?: string): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

interface MaintenanceTableProps {
  records: MaintenanceRecord[];
}

export default function MaintenanceTable({ records }: MaintenanceTableProps) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<MaintenanceRecord["status"] | "">("");
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return records.filter((r) => {
      if (q && !(r.assetName.toLowerCase().includes(q) || r.assetTag.toLowerCase().includes(q))) return false;
      if (status && r.status !== status) return false;
      return true;
    });
  }, [records, query, status]);

  useEffect(() => {
    setPage(0);
  }, [query, status]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRecords = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  return (
    <div>
      <div className={styles.toolbar}>
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Search asset or tag..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          className={styles.filterSelect}
          value={status}
          onChange={(e) => setStatus(e.target.value as MaintenanceRecord["status"] | "")}
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          {STATUS_FILTERS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Asset</th>
              <th>Status</th>
              <th>Sent for repair</th>
              <th>Completed</th>
              <th>Sent by</th>
              <th>Detail</th>
            </tr>
          </thead>
          <tbody>
            {pageRecords.map((r) => (
              <tr key={r.id}>
                <td>
                  <span style={{ fontWeight: 600 }}>{r.assetName}</span>
                  <div className={styles.muted}>{r.assetTag}</div>
                </td>
                <td>
                  <span className={r.status === "In Progress" ? `${styles.badge} ${styles.badgeAmber}` : `${styles.badge} ${styles.badgeGreen}`}>
                    {r.status}
                  </span>
                </td>
                <td className={styles.muted}>{formatDate(r.sentOn)}</td>
                <td className={styles.muted}>{formatDate(r.completedOn)}</td>
                <td className={styles.muted}>{r.sentBy}</td>
                <td className={styles.muted}>{r.detail ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {pageRecords.length === 0 && <div className={styles.empty}>No maintenance records match these filters.</div>}
      </div>
      <Pager page={page} totalPages={totalPages} onChange={setPage} />
    </div>
  );
}
