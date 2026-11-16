"use client";

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
import { withBase } from "@/lib/portal";
import { usePortalBase } from "./usePortalBase";
import styles from "./HomeQuickActions.module.css";

// Every action is a real link into the page that owns that flow - Add
// Employee/Create Project/Create Task used to open their form modal right
// here on Home, but that skipped past the list they'd land on anyway, so
// they just navigate there now like the rest of these do.
export default function HomeQuickActions() {
  const base = usePortalBase();

  return (
    <div className={styles.list}>
      <ActionLink icon={UserPlus} label="Add Employee" href={withBase(base, "/employees/directory")} />
      <ActionLink icon={Briefcase} label="Create Project" href={withBase(base, "/work")} />
      <ActionLink icon={ListChecks} label="Create Task" href={withBase(base, "/work/tasks")} />
      <ActionLink icon={Building2} label="Add Department" href={withBase(base, "/employees/org")} />
      <ActionLink icon={Megaphone} label="Create Announcement" href={withBase(base, "/company-updates/announcements/new")} />
      <ActionButton icon={Inbox} label="Review Requests" disabled />
      <ActionButton icon={CalendarCheck} label="View Attendance" disabled />
      <ActionLink icon={ListChecks} label="View Tasks" href={withBase(base, "/work/tasks")} />
    </div>
  );
}

function ActionButton({
  icon: Icon,
  label,
  disabled,
}: {
  icon: LucideIcon;
  label: string;
  disabled?: boolean;
}) {
  return (
    <span className={`${styles.item} ${styles.itemDisabled}`} title="Coming soon" aria-disabled={disabled}>
      <span className={styles.iconWrap}>
        <Icon size={15} strokeWidth={2} />
      </span>
      <span className={styles.label}>{label}</span>
      <ChevronRight size={16} className={styles.chevron} />
    </span>
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
