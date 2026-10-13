import { Building2 } from "lucide-react";
import type { OrgChartData } from "@/types/hr";
import RevealOnScroll from "./RevealOnScroll";
import styles from "./OrgChart.module.css";

interface OrgChartProps {
  data: OrgChartData;
}

// A vertical org tree: the executive at the root, then one department
// branch per section, each fanning out to its team. Department branches
// reveal (fade + slide in) as they scroll into view, so scrolling down the
// page progressively grows the tree instead of showing it all at once.
export default function OrgChart({ data }: OrgChartProps) {
  return (
    <div className={styles.chart}>
      <div className={styles.executiveCard}>
        <span className={styles.executiveAvatar}>{data.executive.initials}</span>
        <div>
          <div className={styles.executiveName}>{data.executive.name}</div>
          <div className={styles.executiveTitle}>{data.executive.title}</div>
        </div>
      </div>

      {data.departments.map((dept, i) => (
        <RevealOnScroll key={dept.name} delayMs={i === 0 ? 0 : 60} className={styles.branch}>
          <div className={styles.connector} />
          <div className={styles.departmentBlock}>
            <div className={styles.deptNode}>
              <span className={styles.deptIcon}>
                <Building2 size={16} strokeWidth={2} />
              </span>
              <div>
                <div className={styles.deptName}>{dept.name}</div>
                <div className={styles.deptCount}>
                  {dept.employees.length} {dept.employees.length === 1 ? "person" : "people"}
                </div>
              </div>
            </div>

            <div className={styles.teamPanel}>
              <div className={styles.teamRow}>
                {dept.employees.map((person) => (
                  <div className={styles.employeeChip} key={person.id}>
                    <span className={styles.employeeAvatar}>{person.initials}</span>
                    <div className={styles.employeeIdentity}>
                      <span className={styles.employeeName}>{person.name}</span>
                      <span className={styles.employeeTitle}>{person.designation}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </RevealOnScroll>
      ))}
    </div>
  );
}
