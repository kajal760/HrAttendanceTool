import type { AssetItem, AssetStatus } from "@/types/employee";
import styles from "./AssetTable.module.css";

const BADGE_CLASS: Record<AssetStatus, string> = {
  Allocated: "badge-allocated",
  Returned: "badge-returned",
  Lost: "badge-lost",
  Damaged: "badge-damaged",
};

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

interface AssetTableProps {
  assets: AssetItem[];
}

export default function AssetTable({ assets }: AssetTableProps) {
  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th>Asset</th>
          <th>Type</th>
          <th>Tag / Serial</th>
          <th>Allocated on</th>
          <th>Condition</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {assets.map((asset) => (
          <tr key={asset.id}>
            <td>{asset.name}</td>
            <td className={styles.muted}>{asset.type}</td>
            <td className={styles.muted}>{asset.assetTag}</td>
            <td className={styles.muted}>{formatDate(asset.allocatedOn)}</td>
            <td className={styles.muted}>{asset.condition}</td>
            <td>
              <span className={`${styles.badge} ${styles[BADGE_CLASS[asset.status]]}`}>
                {asset.status}
                {asset.status === "Returned" && asset.returnedOn
                  ? ` · ${formatDate(asset.returnedOn)}`
                  : ""}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
