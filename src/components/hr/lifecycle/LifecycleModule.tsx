"use client";

import { useState } from "react";
import type { EmployeeOverview } from "@/types/hr";
import { currentStage, LIFECYCLE_STAGES, type LifecycleStage } from "./stage";
import OverviewTab from "./OverviewTab";
import OnboardingTab from "./OnboardingTab";
import EmploymentChangesTab from "./EmploymentChangesTab";
import SeparationTab from "./SeparationTab";
import FullAndFinalTab from "./FullAndFinalTab";
import EmployeeDetailDrawer from "./EmployeeDetailDrawer";
import styles from "./Lifecycle.module.css";

export type ModuleTab = "joining" | "onboarding" | "confirmation" | "changes" | "role-change" | "separation" | "fnf";

interface LifecycleModuleProps {
  employees: EmployeeOverview[];
  tab: ModuleTab;
}

// Orchestrates the whole Lifecycle section: the stage-timeline summary, and
// whichever of the 7 BRD tabs is active (now driven by the route/secondary
// nav via the `tab` prop, not internal state), plus the shared "View
// Lifecycle" detail drawer. Employee state lives here so an action taken
// from any tab (or the drawer) is reflected everywhere else without a
// full reload.
export default function LifecycleModule({ employees: initial, tab }: LifecycleModuleProps) {
  const [employees, setEmployees] = useState<EmployeeOverview[]>(initial);
  const [detailId, setDetailId] = useState<string | null>(null);

  function updateEmployee(updated: EmployeeOverview) {
    setEmployees((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
  }

  function addEmployee(employee: EmployeeOverview) {
    setEmployees((prev) => [employee, ...prev]);
  }

  const managerOptions = [...employees]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((e) => ({ id: e.id, name: e.name }));

  const stageCounts = new Map<LifecycleStage, number>(LIFECYCLE_STAGES.map((st) => [st, 0]));
  for (const e of employees) {
    const st = currentStage(e);
    stageCounts.set(st, (stageCounts.get(st) ?? 0) + 1);
  }

  const detailEmployee = employees.find((e) => e.id === detailId) ?? null;

  return (
    <div>
      <div className={styles.timeline}>
        {LIFECYCLE_STAGES.map((stage) => (
          <div key={stage} className={styles.timelineStage}>
            <span className={styles.timelineDot}>{stageCounts.get(stage) ?? 0}</span>
            <span className={styles.timelineLabel}>{stage}</span>
            <span className={styles.timelineCount}>employees</span>
          </div>
        ))}
      </div>

      {tab === "joining" && (
        <OverviewTab employees={employees} managerOptions={managerOptions} onViewLifecycle={setDetailId} />
      )}
      {tab === "onboarding" && (
        <OnboardingTab
          employees={employees}
          managerOptions={managerOptions}
          onEmployeeAdded={addEmployee}
          onEmployeeUpdated={updateEmployee}
          onViewLifecycle={setDetailId}
        />
      )}
      {tab === "confirmation" && (
        <EmploymentChangesTab
          employees={employees}
          managerOptions={managerOptions}
          onEmployeeUpdated={updateEmployee}
          onViewLifecycle={setDetailId}
          types={["Confirmation"]}
        />
      )}
      {tab === "changes" && (
        <EmploymentChangesTab
          employees={employees}
          managerOptions={managerOptions}
          onEmployeeUpdated={updateEmployee}
          onViewLifecycle={setDetailId}
          types={["Transfer", "Promotion"]}
        />
      )}
      {tab === "role-change" && (
        <EmploymentChangesTab
          employees={employees}
          managerOptions={managerOptions}
          onEmployeeUpdated={updateEmployee}
          onViewLifecycle={setDetailId}
          types={["Role Change"]}
        />
      )}
      {tab === "separation" && (
        <SeparationTab employees={employees} onEmployeeUpdated={updateEmployee} onViewLifecycle={setDetailId} />
      )}
      {tab === "fnf" && (
        <FullAndFinalTab employees={employees} onEmployeeUpdated={updateEmployee} onViewLifecycle={setDetailId} />
      )}

      {detailEmployee && (
        <EmployeeDetailDrawer
          employee={detailEmployee}
          managerOptions={managerOptions}
          onClose={() => setDetailId(null)}
          onEmployeeUpdated={updateEmployee}
        />
      )}
    </div>
  );
}
