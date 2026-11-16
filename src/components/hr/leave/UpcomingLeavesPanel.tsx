import type { LeaveRequest } from "@/types/employee";
import styles from "./Leave.module.css";

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

interface UpcomingLeavesPanelProps {
  items: LeaveRequest[];
}

// Next few Approved/Pending leaves starting today or later, soonest first -
// a quick-glance companion to whichever calendar view is active.
export default function UpcomingLeavesPanel({ items }: UpcomingLeavesPanelProps) {
  return (
    <div className={styles.calendarCard}>
      <div className={styles.calendarHeader} style={{ marginBottom: 12 }}>
        <span className={styles.monthLabel} style={{ fontSize: 13 }}>Upcoming Leaves</span>
      </div>
      {items.length === 0 ? (
        <p className={styles.empty} style={{ padding: 0, textAlign: "left" }}>Nothing coming up.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {items.map((r) => (
            <div key={r.id} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 999,
                  marginTop: 5,
                  flexShrink: 0,
                  background: r.status === "Approved" ? "var(--color-success)" : "var(--color-warning)",
                }}
              />
              <div>
                <div className={styles.name}>{r.employeeName}</div>
                <div className={styles.meta}>
                  {formatDate(r.startDate)}
                  {r.endDate !== r.startDate ? ` – ${formatDate(r.endDate)}` : ""}
                </div>
                <div className={styles.meta}>{r.category}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
