"use client";

import { useMemo, useState } from "react";
import type { AssetHistoryFeedEvent } from "@/lib/hr/asset-store";
import Pager from "@/components/employee/Pager";
import styles from "../leave/Leave.module.css";

const PAGE_SIZE = 10;

function formatStamp(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface AssetHistoryFeedProps {
  events: AssetHistoryFeedEvent[];
  employeeNames: Record<string, string>;
}

// Cross-asset version of the per-asset "History" modal on Inventory - every
// allocation/return/repair/retirement event, newest first.
export default function AssetHistoryFeed({ events, employeeNames }: AssetHistoryFeedProps) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return events;
    return events.filter(
      (ev) =>
        ev.assetName.toLowerCase().includes(q) ||
        ev.assetTag.toLowerCase().includes(q) ||
        ev.type.toLowerCase().includes(q) ||
        ev.performedBy.toLowerCase().includes(q),
    );
  }, [events, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageEvents = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  return (
    <div>
      <div className={styles.filterRow}>
        <input
          type="text"
          className={styles.departmentSelect}
          style={{ marginLeft: 0, minWidth: 220 }}
          placeholder="Search asset, tag, event, or performed by..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(0);
          }}
        />
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>When</th>
              <th>Asset</th>
              <th>Event</th>
              <th>Owner after</th>
              <th>Done by</th>
            </tr>
          </thead>
          <tbody>
            {pageEvents.map((ev) => (
              <tr key={ev.id}>
                <td className={styles.muted}>{formatStamp(ev.date)}</td>
                <td className={styles.strong}>
                  {ev.assetName} <span className={styles.muted}>({ev.assetTag})</span>
                </td>
                <td>
                  {ev.type}
                  {ev.detail ? ` · ${ev.detail}` : ""}
                </td>
                <td className={styles.muted}>
                  {ev.ownerId === undefined
                    ? "-"
                    : ev.ownerId
                      ? employeeNames[ev.ownerId] ?? ev.ownerId
                      : "Unassigned"}
                </td>
                <td className={styles.muted}>{ev.performedBy}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {pageEvents.length === 0 && <div className={styles.empty}>No asset history in this view.</div>}
      </div>
      <Pager page={page} totalPages={totalPages} onChange={setPage} />
    </div>
  );
}
