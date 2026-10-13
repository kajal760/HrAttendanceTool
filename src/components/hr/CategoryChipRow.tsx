import styles from "./CategoryChipRow.module.css";

export interface CategoryChip {
  label: string;
  value: string | number;
  tone?: "success" | "warning" | "danger" | "info" | "neutral";
}

interface CategoryChipRowProps {
  items: CategoryChip[];
}

// A compact label/value chip row - used wherever Home needs a quick status
// breakdown (attendance today, project health, task status) without the
// weight of a full chart.
export default function CategoryChipRow({ items }: CategoryChipRowProps) {
  return (
    <div className={styles.row}>
      {items.map((item) => (
        <div className={`${styles.chip} ${styles[`tone-${item.tone ?? "neutral"}`]}`} key={item.label}>
          <span className={styles.value}>{item.value}</span>
          <span className={styles.label}>{item.label}</span>
        </div>
      ))}
    </div>
  );
}
