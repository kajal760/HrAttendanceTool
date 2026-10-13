import type { RecentActivityEntry } from "@/types/hr";
import styles from "./RecentActivityList.module.css";

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  const isToday = date.toDateString() === new Date().toDateString();
  const time = date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  if (isToday) return time;
  return `${date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}, ${time}`;
}

interface RecentActivityListProps {
  items: RecentActivityEntry[];
}

export default function RecentActivityList({ items }: RecentActivityListProps) {
  if (items.length === 0) {
    return <p className={styles.empty}>No recent activity yet.</p>;
  }
  return (
    <ul className={styles.list}>
      {items.map((item) => (
        <li className={styles.item} key={item.id}>
          <span className={styles.time}>{formatTimestamp(item.timestamp)}</span>
          <span className={styles.description}>{item.description}</span>
        </li>
      ))}
    </ul>
  );
}
