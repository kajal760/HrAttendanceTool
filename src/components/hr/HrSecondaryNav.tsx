"use client";

import { usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { stripBase, withBase } from "@/lib/portal";
import { usePortalBase } from "./usePortalBase";
import { SECTION_TABS, findActiveSectionKey } from "./nav-config";
import styles from "@/app/superadmin/layout.module.css";

// Sub-navigation for whichever top-level sidebar section is active - Home,
// Log, Employees, etc. each get their own tab set (see nav-config.ts), so
// switching sections in the sidebar swaps this row too. Most tabs are plain
// routes, matched on pathname alone; a few sections (Log's `?module=`,
// Announcements' `?status=`) instead encode which slice to show as a query
// param on one shared route, so switching doesn't reset the page's other
// filters. The active check below is generic over whichever param name(s)
// a section's tabs happen to use, rather than hardcoding one - it collects
// every param key referenced across the section's tabs, then a tab matches
// when pathname matches and its value for each of those keys (or "" if
// absent, e.g. the bare "All"/"Activity Log" tab) equals the current URL's.
//
// Tab hrefs in SECTION_TABS are base-relative - this compares against
// `stripBase(pathname)` and renders real links via `withBase`, so the whole
// thing works identically under `/hr` and `/superadmin`.
export default function HrSecondaryNav() {
  const pathname = usePathname();
  const base = usePortalBase();
  const searchParams = useSearchParams();
  const activeSection = findActiveSectionKey(pathname);
  const tabs = SECTION_TABS[activeSection] ?? [];

  if (tabs.length === 0) return null;

  const relativePathname = stripBase(pathname);

  const relevantParams = new Set<string>();
  for (const tab of tabs) {
    const query = tab.href.split("?")[1];
    if (query) new URLSearchParams(query).forEach((_, key) => relevantParams.add(key));
  }

  return (
    <nav className={styles.secondaryNav} aria-label="Section">
      {tabs.map((tab) => {
        if (!tab.enabled) {
          return (
            <span
              key={tab.href}
              className={`${styles.secondaryLink} ${styles.secondaryLinkDisabled}`}
              title="Coming soon"
              aria-disabled="true"
            >
              {tab.label}
            </span>
          );
        }

        const [tabPath, tabQuery] = tab.href.split("?");
        const tabParams = new URLSearchParams(tabQuery);
        const isActive =
          relativePathname === tabPath &&
          Array.from(relevantParams).every((key) => (tabParams.get(key) ?? "") === (searchParams.get(key) ?? ""));
        return (
          <Link
            key={tab.href}
            href={withBase(base, tab.href)}
            className={`${styles.secondaryLink} ${isActive ? styles.secondaryLinkActive : ""}`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
