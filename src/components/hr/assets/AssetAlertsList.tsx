import { AlertTriangle, Wrench } from "lucide-react";
import styles from "./AssetAlertsList.module.css";

export interface AssetAlert {
  id: string;
  message: string;
  detail: string;
  date: string; // ISO
  tone: "warning" | "danger";
}

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  const isToday = date.toDateString() === new Date().toDateString();
  const time = date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  if (isToday) return time;
  return `${date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}, ${time}`;
}

interface AssetAlertsListProps {
  alerts: AssetAlert[];
}

// Operational call-outs derived from real asset events (sent-to-repair,
// retired) - there's no separate "alerts" concept in the backend, so this
// reads the same event feed `AssetHistoryFeed` does rather than inventing one.
export default function AssetAlertsList({ alerts }: AssetAlertsListProps) {
  if (alerts.length === 0) {
    return <p className={styles.empty}>Nothing needs attention right now.</p>;
  }
  return (
    <ul className={styles.list}>
      {alerts.map((a) => {
        const Icon = a.tone === "danger" ? AlertTriangle : Wrench;
        return (
          <li className={styles.item} key={a.id}>
            <span className={`${styles.iconWrap} ${a.tone === "danger" ? styles.iconDanger : styles.iconWarning}`}>
              <Icon size={14} strokeWidth={2.25} />
            </span>
            <div className={styles.body}>
              <span className={styles.message}>{a.message}</span>
              <span className={styles.detail}>{a.detail}</span>
            </div>
            <span className={styles.time}>{formatTimestamp(a.date)}</span>
          </li>
        );
      })}
    </ul>
  );
}
