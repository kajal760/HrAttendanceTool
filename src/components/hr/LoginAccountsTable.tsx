"use client";

import { useMemo, useState } from "react";
import type { DirectoryAccount } from "@/lib/auth/user-store";
import Pager from "@/components/employee/Pager";
import styles from "./LoginAccountsTable.module.css";

const PAGE_SIZE = 8;

interface LoginAccountsTableProps {
  accounts: DirectoryAccount[];
}

export default function LoginAccountsTable({ accounts }: LoginAccountsTableProps) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);

  const logins = useMemo(() => accounts.filter((a) => a.role !== null), [accounts]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return logins;
    return logins.filter((a) => a.name.toLowerCase().includes(q) || a.email.toLowerCase().includes(q));
  }, [logins, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageAccounts = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  function changeQuery(value: string) {
    setQuery(value);
    setPage(0);
  }

  return (
    <div>
      <p className={styles.note}>
        {logins.length} login account{logins.length === 1 ? "" : "s"} provisioned.
      </p>
      <div className={styles.filterBar}>
        <input
          type="text"
          placeholder="Search by name or username..."
          value={query}
          onChange={(e) => changeQuery(e.target.value)}
          className={styles.searchInput}
        />
      </div>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Employee</th>
              <th>Login username</th>
            </tr>
          </thead>
          <tbody>
            {pageAccounts.map((a) => (
              <tr key={a.employeeId}>
                <td>{a.name}</td>
                <td>{a.email}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {pageAccounts.length === 0 && <div className={styles.empty}>No login accounts match your search.</div>}
      </div>
      {filtered.length > 0 && (
        <p className={styles.resultCount}>
          Showing {page * PAGE_SIZE + 1}–{Math.min(filtered.length, page * PAGE_SIZE + PAGE_SIZE)} of {filtered.length} accounts
        </p>
      )}
      <Pager page={page} totalPages={totalPages} onChange={setPage} />
    </div>
  );
}
