import type { LicenseStatus, SoftwareLicense } from "@/types/employee";
import styles from "./AssetTable.module.css";

const BADGE_CLASS: Record<LicenseStatus, string> = {
  Active: "badge-active",
  "Expiring Soon": "badge-expiringsoon",
  Expired: "badge-expired",
};

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

interface LicenseTableProps {
  licenses: SoftwareLicense[];
}

export default function LicenseTable({ licenses }: LicenseTableProps) {
  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th>License</th>
          <th>Plan</th>
          <th>Assigned on</th>
          <th>Expires</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {licenses.map((license) => (
          <tr key={license.id}>
            <td>{license.name}</td>
            <td className={styles.muted}>{license.seat}</td>
            <td className={styles.muted}>{formatDate(license.assignedOn)}</td>
            <td className={styles.muted}>
              {license.expiresOn ? formatDate(license.expiresOn) : "–"}
            </td>
            <td>
              <span className={`${styles.badge} ${styles[BADGE_CLASS[license.status]]}`}>
                {license.status}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
