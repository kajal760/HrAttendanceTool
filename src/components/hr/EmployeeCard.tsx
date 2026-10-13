"use client";

import Link from "next/link";
import { ChevronDown, Pencil } from "lucide-react";
import type { EmployeeOverview, EmployeeStatus } from "@/types/hr";
import { withBase } from "@/lib/portal";
import { usePortalBase } from "./usePortalBase";
import styles from "./EmployeeCard.module.css";

const STATUS_CLASS: Record<EmployeeStatus, string> = {
  Onboarding: "status-onboarding",
  Probation: "status-probation",
  Active: "status-active",
  "On Leave": "status-onleave",
  "Notice Period": "status-notice",
  Resigned: "status-resigned",
  Exited: "status-exited",
};

function performanceBand(score: number): { label: string; tone: "success" | "info" | "warning" } {
  if (score >= 85) return { label: "Excellent", tone: "success" };
  if (score >= 70) return { label: "Good", tone: "info" };
  return { label: "Needs improvement", tone: "warning" };
}

function toneFor(pct: number): "success" | "info" | "warning" {
  if (pct >= 85) return "success";
  if (pct >= 60) return "info";
  return "warning";
}

function formatJoined(date: string): string {
  return new Date(date).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatSalary(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}/yr`;
}

function tenureLabel(joinedOn: string): string {
  const start = new Date(joinedOn);
  const now = new Date();
  let months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  if (now.getDate() < start.getDate()) months -= 1;
  const years = Math.floor(months / 12);
  const remMonths = months % 12;
  if (years <= 0) return `${remMonths} mo`;
  if (remMonths === 0) return `${years} yr`;
  return `${years} yr ${remMonths} mo`;
}

function StatBar({
  label,
  valueText,
  pct,
  tone,
}: {
  label: string;
  valueText: string;
  pct: number;
  tone: "success" | "info" | "warning";
}) {
  return (
    <div className={styles.statRow}>
      <div className={styles.statTop}>
        <span className={styles.statLabel}>{label}</span>
        <span className={styles.statValue}>{valueText}</span>
      </div>
      <div className={styles.track}>
        <div
          className={`${styles.fill} ${styles[`tone-${tone}`]}`}
          style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
        />
      </div>
    </div>
  );
}

interface EmployeeCardProps {
  employee: EmployeeOverview;
  expanded: boolean;
  onToggle: () => void;
  onEdit: (employee: EmployeeOverview) => void;
}

// Collapsed: identity + a quick performance glance. Expanded (click):
// grows to 2 grid rows and adds attendance, leave, tasks, pending requests,
// and tenure - the "what does a super admin need to see" summary. Expand
// state is controlled by the parent grid so only one card is open at a time.
export default function EmployeeCard({ employee, expanded, onToggle, onEdit }: EmployeeCardProps) {
  const base = usePortalBase();
  const band = performanceBand(employee.performanceScore);

  return (
    <div
      className={`${styles.card} ${expanded ? styles.expanded : ""} ${employee.deactivated ? styles.deactivated : ""}`}
      role="button"
      tabIndex={0}
      aria-expanded={expanded}
      onClick={onToggle}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onToggle();
        }
      }}
    >
      <div className={styles.header}>
        <span className={styles.avatar}>
          {employee.photoUrl ? (
            <img src={employee.photoUrl} alt="" className={styles.avatarImg} />
          ) : (
            employee.initials
          )}
        </span>
        <div className={styles.identity}>
          <span className={styles.name}>{employee.name}</span>
          <span className={styles.designation}>{employee.designation}</span>
        </div>
        <span
          className={`${styles.statusDot} ${styles[STATUS_CLASS[employee.status]]}`}
          title={employee.status}
        />
      </div>

      <span className={styles.deptBadge}>{employee.department}</span>

      <div className={styles.quickStat}>
        <span className={styles.quickStatLabel}>Performance</span>
        <div className={styles.track}>
          <div
            className={`${styles.fill} ${styles[`tone-${band.tone}`]}`}
            style={{ width: `${employee.performanceScore}%` }}
          />
        </div>
        <span className={styles.quickStatValue}>{employee.performanceScore}</span>
      </div>

      <span className={styles.chevron}>
        <ChevronDown size={14} className={expanded ? styles["chevron-open"] : ""} />
      </span>

      {expanded && (
        <div className={styles.details}>
          <StatBar
            label="Performance"
            valueText={`${employee.performanceScore} · ${band.label}`}
            pct={employee.performanceScore}
            tone={band.tone}
          />
          <StatBar
            label="Attendance (this month)"
            valueText={`${employee.attendancePct}%`}
            pct={employee.attendancePct}
            tone={toneFor(employee.attendancePct)}
          />
          <StatBar
            label="Leave balance"
            valueText={`${employee.leave.remaining} of ${employee.leave.allocated} left`}
            pct={(employee.leave.remaining / employee.leave.allocated) * 100}
            tone="info"
          />
          <StatBar
            label="Task completion"
            valueText={`${employee.tasks.completed} done · ${employee.tasks.active} active`}
            pct={employee.tasks.completionPct}
            tone={toneFor(employee.tasks.completionPct)}
          />
          <div className={styles.statTop}>
            <span className={styles.statLabel}>Pending requests</span>
            {employee.pendingRequests > 0 ? (
              <span className={styles.requestsBadge}>{employee.pendingRequests}</span>
            ) : (
              <span className={styles.statValue}>None</span>
            )}
          </div>
          <div className={styles.statTop}>
            <span className={styles.statLabel}>Age</span>
            <span className={styles.statValue}>{employee.age}</span>
          </div>
          <div className={styles.statTop}>
            <span className={styles.statLabel}>Salary</span>
            <span className={styles.statValue}>{formatSalary(employee.salary)}</span>
          </div>
          <div className={styles.footer}>
            <span>
              {`Joined ${formatJoined(employee.joinedOn)} · ${tenureLabel(employee.joinedOn)}`}
              {employee.deactivated ? " · Deactivated" : ""}
            </span>
            <span>{employee.email}</span>
          </div>
          <div className={styles.detailActions}>
            <Link
              href={withBase(base, `/employees/${employee.id}`)}
              className={styles.profileLink}
              onClick={(e) => e.stopPropagation()}
            >
              View full profile →
            </Link>
            <button
              type="button"
              className={styles.editButton}
              onClick={(e) => {
                e.stopPropagation();
                onEdit(employee);
              }}
            >
              <Pencil size={12} strokeWidth={2.25} />
              Edit
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
