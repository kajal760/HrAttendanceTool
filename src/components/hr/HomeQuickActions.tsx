"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  UserPlus,
  Briefcase,
  ListChecks,
  Building2,
  Megaphone,
  Inbox,
  CalendarCheck,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import type { EmployeeOverview } from "@/types/hr";
import type { Project, WorkTask } from "@/types/work";
import { withBase } from "@/lib/portal";
import { usePortalBase } from "./usePortalBase";
import EmployeeFormModal from "./EmployeeFormModal";
import ProjectFormModal from "./ProjectFormModal";
import TaskFormModal from "./TaskFormModal";
import styles from "./HomeQuickActions.module.css";

type ModalKind = "employee" | "project" | "task" | null;

interface HomeQuickActionsProps {
  employees: EmployeeOverview[];
  projects: Project[];
  tasks: WorkTask[];
}

// Fixed action set (not data-driven like the old QuickActionsList) since
// each one now does something different: three open a modal right here on
// Home, two are real links into already-built pages, and three are "coming
// soon" until their underlying module (announcements, requests, attendance)
// exists.
export default function HomeQuickActions({ employees, projects, tasks }: HomeQuickActionsProps) {
  const router = useRouter();
  const base = usePortalBase();
  const [modal, setModal] = useState<ModalKind>(null);

  function closeModal() {
    setModal(null);
  }

  return (
    <div className={styles.list}>
      <ActionButton icon={UserPlus} label="Add Employee" onClick={() => setModal("employee")} />
      <ActionButton icon={Briefcase} label="Create Project" onClick={() => setModal("project")} />
      <ActionButton icon={ListChecks} label="Create Task" onClick={() => setModal("task")} />
      <ActionLink icon={Building2} label="Add Department" href={withBase(base, "/employees/org")} />
      <ActionLink icon={Megaphone} label="Create Announcement" href={withBase(base, "/announcements/new")} />
      <ActionButton icon={Inbox} label="Review Requests" disabled />
      <ActionButton icon={CalendarCheck} label="View Attendance" disabled />
      <ActionLink icon={ListChecks} label="View Tasks" href={withBase(base, "/work/tasks")} />

      {modal === "employee" && (
        <EmployeeFormModal
          mode="add"
          onClose={closeModal}
          onSaved={() => {
            closeModal();
            router.push(withBase(base, "/employees"));
          }}
        />
      )}
      {modal === "project" && (
        <ProjectFormModal
          mode="add"
          employees={employees}
          onClose={closeModal}
          onSaved={() => {
            closeModal();
            router.push(withBase(base, "/work"));
          }}
        />
      )}
      {modal === "task" && (
        <TaskFormModal
          mode="add"
          projects={projects}
          employees={employees}
          tasks={tasks}
          onClose={closeModal}
          onSaved={() => {
            closeModal();
            router.push(withBase(base, "/work/tasks"));
          }}
        />
      )}
    </div>
  );
}

function ActionButton({
  icon: Icon,
  label,
  onClick,
  disabled,
}: {
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  if (disabled) {
    return (
      <span className={`${styles.item} ${styles.itemDisabled}`} title="Coming soon" aria-disabled="true">
        <span className={styles.iconWrap}>
          <Icon size={15} strokeWidth={2} />
        </span>
        <span className={styles.label}>{label}</span>
        <ChevronRight size={16} className={styles.chevron} />
      </span>
    );
  }
  return (
    <button type="button" className={styles.item} onClick={onClick}>
      <span className={styles.iconWrap}>
        <Icon size={15} strokeWidth={2} />
      </span>
      <span className={styles.label}>{label}</span>
      <ChevronRight size={16} className={styles.chevron} />
    </button>
  );
}

function ActionLink({ icon: Icon, label, href }: { icon: LucideIcon; label: string; href: string }) {
  return (
    <Link href={href} className={styles.item}>
      <span className={styles.iconWrap}>
        <Icon size={15} strokeWidth={2} />
      </span>
      <span className={styles.label}>{label}</span>
      <ChevronRight size={16} className={styles.chevron} />
    </Link>
  );
}
