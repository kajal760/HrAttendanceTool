import styles from "./StatCard.module.css";

type Tone = "neutral" | "success" | "warning" | "info";

interface StatCardProps {
  label: string;
  value: number | string;
  unit?: string;
  tone?: Tone;
}

export default function StatCard({
  label,
  value,
  unit,
  tone = "neutral",
}: StatCardProps) {
  return (
    <div className={`${styles.card} ${styles[`tone-${tone}`]}`}>
      <span className={styles.label}>{label}</span>
      <div className={styles.valueRow}>
        <span className={styles.value}>{value}</span>
        {unit ? <span className={styles.unit}>{unit}</span> : null}
      </div>
    </div>
  );
}
