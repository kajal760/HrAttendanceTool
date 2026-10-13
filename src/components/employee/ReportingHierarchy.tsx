import type { EmployeeOverview } from "@/types/hr";
import styles from "./ReportingHierarchy.module.css";

interface ReportingHierarchyProps {
  me: EmployeeOverview;
  chain: EmployeeOverview[]; // ordered immediate manager -> ... -> topmost, will be reversed for display
  reports: EmployeeOverview[];
}

function Node({ employee, highlight }: { employee: EmployeeOverview; highlight?: boolean }) {
  return (
    <div className={`${styles.node} ${highlight ? styles.nodeHighlight : ""}`}>
      <span className={styles.avatar}>
        {employee.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={employee.photoUrl} alt="" className={styles.avatarImg} />
        ) : (
          employee.initials
        )}
      </span>
      <div className={styles.nodeBody}>
        <span className={styles.nodeName}>{highlight ? "You" : employee.name}</span>
        <span className={styles.nodeMeta}>
          {employee.designation} &middot; {employee.department}
        </span>
      </div>
    </div>
  );
}

// Just the signed-in employee's own place in the org, not the whole company
// chart: their manager chain upward, then them, then their own direct
// reports (if any) below.
export default function ReportingHierarchy({ me, chain, reports }: ReportingHierarchyProps) {
  const topDown = [...chain].reverse();

  return (
    <div className={styles.wrap}>
      {topDown.length === 0 ? (
        <p className={styles.empty}>No manager assigned.</p>
      ) : (
        <div className={styles.chain}>
          {topDown.map((manager) => (
            <Node key={manager.id} employee={manager} />
          ))}
        </div>
      )}

      <Node employee={me} highlight />

      <div className={styles.reportsSection}>
        <p className={styles.reportsLabel}>Direct reports</p>
        {reports.length === 0 ? (
          <p className={styles.empty}>No direct reports.</p>
        ) : (
          <div className={styles.reportsGrid}>
            {reports.map((report) => (
              <Node key={report.id} employee={report} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
