"use client";

import { useState } from "react";
import { BarChart3, Table as TableIcon } from "lucide-react";
import type { LeaveRequest } from "@/types/employee";
import LeaveHistoryChart from "./LeaveHistoryChart";
import LeaveHistoryList from "./LeaveHistoryList";
import styles from "./LeaveHistorySection.module.css";

interface LeaveHistorySectionProps {
  requests: LeaveRequest[];
}

// Leave history as either a graph (approved days per month, last 6 months)
// or the existing table view - one toggle instead of two separate
// tabs/pages, per the combined Attendance & Leave page's Leave tab.
export default function LeaveHistorySection({ requests }: LeaveHistorySectionProps) {
  const [view, setView] = useState<"graph" | "table">("graph");

  return (
    <div>
      <div className={styles.toggleRow}>
        <button
          type="button"
          className={`${styles.toggleButton} ${view === "graph" ? styles.toggleButtonActive : ""}`}
          aria-pressed={view === "graph"}
          onClick={() => setView("graph")}
        >
          <BarChart3 size={13} strokeWidth={2.25} /> Graph
        </button>
        <button
          type="button"
          className={`${styles.toggleButton} ${view === "table" ? styles.toggleButtonActive : ""}`}
          aria-pressed={view === "table"}
          onClick={() => setView("table")}
        >
          <TableIcon size={13} strokeWidth={2.25} /> Table
        </button>
      </div>
      {view === "graph" ? <LeaveHistoryChart requests={requests} /> : <LeaveHistoryList requests={requests} />}
    </div>
  );
}
