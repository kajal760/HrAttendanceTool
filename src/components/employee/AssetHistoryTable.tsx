"use client";

import { useMemo, useState } from "react";
import type { AssetHistoryEntry } from "@/types/employee";
import Pager from "./Pager";
import styles from "./AssetTable.module.css";

const PAGE_SIZE = 5;

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

interface AssetHistoryTableProps {
  entries: AssetHistoryEntry[];
}

export default function AssetHistoryTable({ entries }: AssetHistoryTableProps) {
  const [page, setPage] = useState(0);

  const sorted = useMemo(() => [...entries].sort((a, b) => (a.date < b.date ? 1 : -1)), [entries]);
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageEntries = sorted.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  if (sorted.length === 0) {
    return <p className={styles.muted}>No asset history yet.</p>;
  }

  return (
    <div>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Date</th>
            <th>Asset</th>
            <th>Action</th>
            <th>Note</th>
          </tr>
        </thead>
        <tbody>
          {pageEntries.map((entry) => (
            <tr key={entry.id}>
              <td className={styles.muted}>{formatDate(entry.date)}</td>
              <td>{entry.assetName}</td>
              <td className={styles.muted}>{entry.action}</td>
              <td className={styles.muted} style={{ whiteSpace: "normal" }}>
                {entry.note ?? "–"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <Pager page={page} totalPages={totalPages} onChange={setPage} />
    </div>
  );
}
