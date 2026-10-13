"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { withBase } from "@/lib/portal";
import { usePortalBase } from "./usePortalBase";
import { SIDEBAR_SECTIONS, findActiveSectionKey } from "./nav-config";
import styles from "@/app/superadmin/layout.module.css";

interface HrSidebarProps {
  pendingRequestCount: number;
}

export default function HrSidebar({ pendingRequestCount }: HrSidebarProps) {
  const pathname = usePathname();
  const base = usePortalBase();
  const activeSection = findActiveSectionKey(pathname);

  // Coming-soon (disabled) items sink to the bottom of their group instead
  // of breaking up the list of things you can actually click - `sort` is
  // stable, so enabled/disabled each keep their relative BRD order.
  function byEnabledFirst(a: (typeof SIDEBAR_SECTIONS)[number], b: (typeof SIDEBAR_SECTIONS)[number]) {
    return (a.enabled ? 0 : 1) - (b.enabled ? 0 : 1);
  }

  const primary = SIDEBAR_SECTIONS.filter((s) => s.group === "primary").sort(byEnabledFirst);
  const more = SIDEBAR_SECTIONS.filter((s) => s.group === "more").sort(byEnabledFirst);

  function renderSection(section: (typeof SIDEBAR_SECTIONS)[number]) {
    const Icon = section.icon;
    const badge = section.key === "requests" ? pendingRequestCount : undefined;

    if (!section.enabled) {
      return (
        <span
          key={section.key}
          className={`${styles.sidebarItem} ${styles.sidebarItemDisabled}`}
          title="Coming soon"
          aria-disabled="true"
        >
          {!!badge && <span className={styles.sidebarBadge}>{badge}</span>}
          <Icon size={20} strokeWidth={1.75} />
          <span>{section.label}</span>
        </span>
      );
    }

    const isActive = activeSection === section.key;
    return (
      <Link
        key={section.key}
        href={withBase(base, section.href)}
        className={`${styles.sidebarItem} ${isActive ? styles.sidebarItemActive : ""}`}
      >
        {!!badge && <span className={styles.sidebarBadge}>{badge}</span>}
        <Icon size={20} strokeWidth={1.75} />
        <span>{section.label}</span>
      </Link>
    );
  }

  return (
    <aside className={styles.sidebar} aria-label="Super admin module">
      {primary.map(renderSection)}
      <div className={styles.sidebarDivider} />
      {more.map(renderSection)}
    </aside>
  );
}
