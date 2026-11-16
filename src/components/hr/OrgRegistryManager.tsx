import type { OrgRegistryItem } from "@/types/hr";
import styles from "./OrgRegistryManager.module.css";

interface OrgRegistryManagerProps {
  title: string;
  initialItems: OrgRegistryItem[];
}

// Read-only list of one org registry resource (departments, designations, or
// locations). These are never typed in by hand here - they come into being
// automatically the first time an employee is assigned to that department,
// designation, or location (see `resolveRegistryId` in org-registry-store.ts),
// so the list and the org chart below it both just reflect what already exists.
export default function OrgRegistryManager({ title, initialItems }: OrgRegistryManagerProps) {
  return (
    <div className={styles.card}>
      <h3 className={styles.title}>{title}</h3>
      <ul className={styles.list}>
        {initialItems.map((item) => (
          <li key={item.id} className={styles.row}>
            <span>{item.name}</span>
          </li>
        ))}
        {initialItems.length === 0 && <li className={styles.empty}>None yet.</li>}
      </ul>
    </div>
  );
}
