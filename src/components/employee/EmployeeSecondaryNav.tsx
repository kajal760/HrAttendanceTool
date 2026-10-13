"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { SECTION_TABS, findActiveNavKey } from "./nav-config";
import styles from "@/app/employee/layout.module.css";

// Sub-navigation for whichever top-level sidebar section is active - only
// Attendance & Leave has sub-pages (Today/Calendar/Leave/Corrections/Clock
// ins-outs) right now, so this renders nothing elsewhere.
export default function EmployeeSecondaryNav() {
  const pathname = usePathname();
  const activeSection = findActiveNavKey(pathname);
  const tabs = SECTION_TABS[activeSection] ?? [];

  if (tabs.length === 0) return null;

  return (
    <nav className={styles.secondaryNav} aria-label="Section">
      {tabs.map((tab) => {
        const isActive = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`${styles.secondaryLink} ${isActive ? styles.secondaryLinkActive : ""}`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
