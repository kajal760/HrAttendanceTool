import type { LeaveTypeBalance } from "@/types/employee";
import styles from "./LeaveBalanceList.module.css";

interface LeaveBalanceListProps {
  items: LeaveTypeBalance[];
}

// Compact card grid (not the old progress-bar rows) - sized to sit in a
// sidebar alongside the leave history, rather than taking up the main
// column.
export default function LeaveBalanceList({ items }: LeaveBalanceListProps) {
  return (
    <div className={styles.grid}>
      {items.map((item) => (
        <div className={styles.card} key={item.type}>
          <span className={styles.remaining}>
            {item.remaining}
            <span className={styles.allocated}>/{item.allocated}</span>
          </span>
          <span className={styles.type}>{item.type.replace(" Leave", "")}</span>
        </div>
      ))}
    </div>
  );
}
