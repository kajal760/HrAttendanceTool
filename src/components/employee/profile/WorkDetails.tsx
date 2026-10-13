import type { EmployeeOverview } from "@/types/hr";
import SectionCard from "../SectionCard";
import { formatDate, formatSalary } from "@/lib/employee/profile-format";
import Fact from "./Fact";
import styles from "./Profile.module.css";

interface WorkDetailsProps {
  employee: EmployeeOverview;
  managerName?: string;
}

// Read-only - department, designation, salary, lifecycle, etc. are
// HR/Manager-owned from the Super Admin side. Skills/Education/Experience
// don't fit Personal Details or Contact either, so they land here as the
// catch-all for everything about the employee's work life.
export default function WorkDetails({ employee, managerName }: WorkDetailsProps) {
  return (
    <div className={styles.grid}>
      <SectionCard title="Employment">
        <div className={styles.factGrid}>
          <Fact label="Department" value={employee.department} />
          <Fact label="Designation" value={employee.designation} />
          <Fact label="Manager" value={managerName ?? "Unassigned"} />
          <Fact label="Location" value={employee.location ?? "-"} />
          <Fact label="Work type" value={employee.workType ?? "-"} />
          <Fact label="Joined" value={formatDate(employee.joinedOn)} />
          <Fact label="Age" value={String(employee.age)} />
          <Fact label="Salary" value={formatSalary(employee.salary)} />
        </div>
      </SectionCard>

      <SectionCard title="Skills">
        {employee.skills.length === 0 ? (
          <div className={styles.emptyHint}>No skills on file yet.</div>
        ) : (
          <div className={styles.chipRow}>
            {employee.skills.map((skill) => (
              <span key={skill} className={styles.chip}>
                {skill}
              </span>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard title="Education">
        {employee.education.length === 0 ? (
          <div className={styles.emptyHint}>No education records on file.</div>
        ) : (
          <ul className={styles.list}>
            {employee.education.map((rec) => (
              <li key={rec.id} className={styles.listRow}>
                <span className={styles.listTitle}>{rec.degree}</span>
                <span className={styles.listMeta}>
                  {rec.institution} &middot; {rec.year}
                </span>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard title="Experience">
        {employee.experience.length === 0 ? (
          <div className={styles.emptyHint}>No prior experience on file.</div>
        ) : (
          <ul className={styles.list}>
            {employee.experience.map((rec) => (
              <li key={rec.id} className={styles.listRow}>
                <span className={styles.listTitle}>
                  {rec.role} &middot; {rec.company}
                </span>
                <span className={styles.listMeta}>{rec.durationYears} yr</span>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
