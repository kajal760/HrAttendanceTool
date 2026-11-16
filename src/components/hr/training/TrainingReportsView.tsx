"use client";

import { useMemo } from "react";
import { BookOpen, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import type { EmployeeTraining, TrainingDashboard } from "@/types/training";
import StatTile from "../StatTile";
import styles from "../lifecycle/Lifecycle.module.css";

export default function TrainingReportsView({
  dashboard,
  assignments,
}: {
  dashboard: TrainingDashboard;
  assignments: EmployeeTraining[];
}) {
  const stats = [
    { label: "Total Trainings", value: dashboard.total, icon: BookOpen, tone: "accent" as const },
    { label: "Completed", value: dashboard.completed, icon: CheckCircle2, tone: "success" as const },
    { label: "In Progress", value: dashboard.inProgress, icon: Clock, tone: "info" as const },
    { label: "Overdue", value: dashboard.overdue, icon: AlertTriangle, tone: "danger" as const },
  ];

  const byDepartment = useMemo(() => {
    const map = new Map<string, { total: number; completed: number }>();
    for (const a of assignments) {
      const dept = a.department ?? "Unassigned";
      const entry = map.get(dept) ?? { total: 0, completed: 0 };
      entry.total += 1;
      if (a.status === "Completed") entry.completed += 1;
      map.set(dept, entry);
    }
    return Array.from(map.entries())
      .map(([department, v]) => ({ department, ...v }))
      .sort((a, b) => b.total - a.total);
  }, [assignments]);

  const byEmployee = useMemo(() => {
    const map = new Map<string, { employeeName: string; department?: string; total: number; completed: number; overdue: number }>();
    for (const a of assignments) {
      const entry = map.get(a.employeeId) ?? { employeeName: a.employeeName, department: a.department, total: 0, completed: 0, overdue: 0 };
      entry.total += 1;
      if (a.status === "Completed") entry.completed += 1;
      if (a.status === "Overdue") entry.overdue += 1;
      map.set(a.employeeId, entry);
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [assignments]);

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 14, marginBottom: 18 }}>
        {stats.map((s) => (
          <StatTile key={s.label} label={s.label} value={s.value} icon={s.icon} tone={s.tone} />
        ))}
      </div>

      <h2 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 10px" }}>Department-wise report</h2>
      <div className={styles.tableWrap} style={{ marginBottom: 24 }}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Department</th>
              <th>Trainings Assigned</th>
              <th>Completed</th>
              <th>Completion Rate</th>
            </tr>
          </thead>
          <tbody>
            {byDepartment.map((d) => (
              <tr key={d.department}>
                <td style={{ fontWeight: 600 }}>{d.department}</td>
                <td>{d.total}</td>
                <td>{d.completed}</td>
                <td>{d.total ? Math.round((d.completed / d.total) * 100) : 0}%</td>
              </tr>
            ))}
          </tbody>
        </table>
        {byDepartment.length === 0 && <div className={styles.empty}>No assignment data yet.</div>}
      </div>

      <h2 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 10px" }}>Employee-wise report</h2>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Employee</th>
              <th>Department</th>
              <th>Trainings Assigned</th>
              <th>Completed</th>
              <th>Overdue</th>
            </tr>
          </thead>
          <tbody>
            {byEmployee.map((e) => (
              <tr key={e.employeeName}>
                <td style={{ fontWeight: 600 }}>{e.employeeName}</td>
                <td className={styles.muted}>{e.department ?? "-"}</td>
                <td>{e.total}</td>
                <td>{e.completed}</td>
                <td>{e.overdue}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {byEmployee.length === 0 && <div className={styles.empty}>No assignment data yet.</div>}
      </div>
    </div>
  );
}
