"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  Clock,
  ListChecks,
  CalendarDays,
  User,
  FileText,
  Send,
  Megaphone,
  Package,
  type LucideIcon,
} from "lucide-react";
import { PRIMARY_NAV, SECONDARY_NAV, findActiveNavKey } from "./nav-config";
import styles from "@/app/employee/layout.module.css";

const ICONS: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  attendance: Clock,
  leave: CalendarDays,
  tasks: ListChecks,
  profile: User,
  documents: FileText,
  requests: Send,
  announcements: Megaphone,
  assets: Package,
};

export default function EmployeeSidebar() {
  const pathname = usePathname();
  const activeKey = findActiveNavKey(pathname);

  return (
    <aside className={styles.sidebar} aria-label="Employee module">
      {PRIMARY_NAV.map((item) => {
        const Icon = ICONS[item.key];
        const isActive = activeKey === item.key;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`${styles.sidebarItem} ${isActive ? styles.sidebarItemActive : ""}`}
          >
            <Icon size={20} strokeWidth={1.75} />
            <span>{item.label}</span>
          </Link>
        );
      })}

      <div className={styles.sidebarDivider} />

      {SECONDARY_NAV.map((item) => {
        const Icon = ICONS[item.key];
        const isActive = activeKey === item.key;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`${styles.sidebarItem} ${styles.sidebarItemSecondary} ${isActive ? styles.sidebarItemActive : ""}`}
          >
            <Icon size={18} strokeWidth={1.75} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </aside>
  );
}
