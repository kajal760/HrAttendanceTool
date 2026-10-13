"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Table } from "lucide-react";
import styles from "./ProjectBoard.module.css";

interface WorkViewToggleProps {
  board: ReactNode;
  table: ReactNode;
}

// A single "Table" button on the Projects, Tasks, and Workload pages. Off
// shows the page's normal board; on shows the same records as a table. The
// table is built from server data, so opening it refreshes that data first
// (the board keeps its own state, which is already up to date).
export default function WorkViewToggle({ board, table }: WorkViewToggleProps) {
  const router = useRouter();
  const [tableView, setTableView] = useState(false);
  const [boardKey, setBoardKey] = useState(0);

  // Fresh server data arrives with a new `board` element - remount the board
  // so it starts from it rather than from its stale local copy.
  useEffect(() => {
    setBoardKey((k) => k + 1);
  }, [board]);

  function toggle() {
    if (!tableView) router.refresh();
    setTableView((v) => !v);
  }

  return (
    <div>
      <div className={styles.toolbar} style={{ justifyContent: "flex-end", marginBottom: 12 }}>
        <button
          type="button"
          className={`${styles.viewButton} ${tableView ? styles.viewButtonActive : ""}`}
          aria-pressed={tableView}
          onClick={toggle}
        >
          <Table size={13} strokeWidth={2.25} style={{ marginRight: 6, verticalAlign: "-2px" }} />
          Table
        </button>
      </div>
      <div key={boardKey} hidden={tableView}>{board}</div>
      <div hidden={!tableView}>{table}</div>
    </div>
  );
}
