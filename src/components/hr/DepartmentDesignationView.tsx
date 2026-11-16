"use client";

import { useState } from "react";
import type { EmployeeOverview, OrgRegistryItem } from "@/types/hr";
import DepartmentGrid, { type DepartmentSummary } from "./DepartmentGrid";
import DesignationTable from "./DesignationTable";
import styles from "./lifecycle/Lifecycle.module.css";

interface DepartmentDesignationViewProps {
  departments: DepartmentSummary[];
  employees: EmployeeOverview[];
  designations: OrgRegistryItem[];
  designationsReadOnly: boolean;
}

// Departments and Designations used to be two separate tab pages - combined
// here behind two buttons instead, since switching between them is more
// common than needing both open side by side.
export default function DepartmentDesignationView({
  departments,
  employees,
  designations,
  designationsReadOnly,
}: DepartmentDesignationViewProps) {
  const [view, setView] = useState<"departments" | "designations">("departments");

  return (
    <>
      <div className={styles.tabStrip}>
        <button
          type="button"
          className={`${styles.tab} ${view === "departments" ? styles.tabActive : ""}`}
          onClick={() => setView("departments")}
        >
          Departments
        </button>
        <button
          type="button"
          className={`${styles.tab} ${view === "designations" ? styles.tabActive : ""}`}
          onClick={() => setView("designations")}
        >
          Designations
        </button>
      </div>

      {view === "departments" ? (
        <DepartmentGrid departments={departments} employees={employees} />
      ) : (
        <DesignationTable initialItems={designations} employees={employees} readOnly={designationsReadOnly} />
      )}
    </>
  );
}
