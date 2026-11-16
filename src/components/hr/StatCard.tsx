import type { ReactNode } from "react";
import styles from "./lifecycle/Lifecycle.module.css";

interface StatCardProps {
  label: string;
  value: ReactNode;
}

export default function StatCard({ label, value }: StatCardProps) {
  return (
    <div className={styles.statCard}>
      <span className={styles.statValue}>{value}</span>
      <span className={styles.statLabel}>{label}</span>
    </div>
  );
}
