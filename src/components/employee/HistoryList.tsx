import type { HistoryEntry } from "@/types/employee";
import styles from "./HistoryList.module.css";

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

interface HistoryListProps {
  items: HistoryEntry[];
}

export default function HistoryList({ items }: HistoryListProps) {
  return (
    <ul className={styles.list}>
      {items.map((entry) => (
        <li className={styles.item} key={entry.id}>
          <span className={`${styles.dot} ${styles[`dot-${entry.type}`]}`} />
          <div className={styles.body}>
            <span className={styles.description}>{entry.description}</span>
            <span className={styles.meta}>
              {formatDate(entry.date)}
              {entry.meta ? ` · ${entry.meta}` : ""}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}
