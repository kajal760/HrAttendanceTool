// Single source of truth for the employee module's two-tier nav: an icon
// sidebar for top-level sections, and a horizontal secondary nav (see
// SECTION_TABS) for sub-pages within whichever section is active - same
// pattern as the Super Admin portal's nav-config.ts.
//
// Primary items and their sub-tabs follow the BRD's employee navigation
// spec exactly: Attendance and Leave are separate top-level sections (not
// combined), and Tasks & Projects, My Profile, and Documents each have
// their own BRD-specified sub-tabs. Requests/Announcements/Assets aren't in
// the BRD's list (it calls them out as separate/future modules) but already
// have working pages here, so they stay reachable as a secondary group
// rather than being cut. Timesheets and the old standalone "Clock ins/outs"
// page were retired - both are now covered by Attendance's History tab.

export interface EmployeeNavItem {
  key: string;
  label: string;
  href: string;
}

export const PRIMARY_NAV: EmployeeNavItem[] = [
  { key: "dashboard", label: "Dashboard", href: "/employee" },
  { key: "attendance", label: "Attendance", href: "/employee/attendance" },
  { key: "leave", label: "Leave", href: "/employee/leave" },
  { key: "tasks", label: "Tasks & Projects", href: "/employee/tasks" },
  { key: "profile", label: "My Profile", href: "/employee/profile" },
  { key: "documents", label: "Documents", href: "/employee/documents" },
];

export const SECONDARY_NAV: EmployeeNavItem[] = [
  { key: "requests", label: "Requests", href: "/employee/requests" },
  { key: "announcements", label: "Announcements", href: "/employee/announcements" },
  { key: "assets", label: "Assets", href: "/employee/assets" },
];

export interface SecondaryTab {
  label: string;
  href: string;
}

export const SECTION_TABS: Record<string, SecondaryTab[]> = {
  attendance: [
    { label: "Today", href: "/employee/attendance" },
    { label: "Attendance History", href: "/employee/attendance/history" },
    { label: "Breaks", href: "/employee/attendance/breaks" },
    { label: "Timesheet", href: "/employee/attendance/timesheet" },
    { label: "Corrections", href: "/employee/attendance/corrections" },
  ],
  leave: [
    { label: "Leave Balance", href: "/employee/leave" },
    { label: "Apply Leave", href: "/employee/leave/apply" },
    { label: "Leave History", href: "/employee/leave/history" },
  ],
  tasks: [
    { label: "My Tasks", href: "/employee/tasks" },
    { label: "Projects", href: "/employee/projects" },
    { label: "Dependencies", href: "/employee/tasks/dependencies" },
  ],
  profile: [
    { label: "Personal Details", href: "/employee/profile" },
    { label: "Contact", href: "/employee/profile/contact" },
    { label: "Work Details", href: "/employee/profile/work" },
  ],
  documents: [
    { label: "Company Policies", href: "/employee/documents" },
    { label: "SOPs", href: "/employee/documents/sops" },
    { label: "Reporting Hierarchy", href: "/employee/documents/hierarchy" },
  ],
};

// Longest-href match wins so a sub-route doesn't fall back to matching
// Dashboard's "/employee" prefix. Also checks SECTION_TABS hrefs, not just
// PRIMARY_NAV/SECONDARY_NAV - needed for a tab like Projects whose route
// (/employee/projects) isn't a sub-path of its section's own primary href
// (/employee/tasks).
export function findActiveNavKey(pathname: string): string {
  const candidates: { key: string; href: string }[] = [
    ...PRIMARY_NAV,
    ...SECONDARY_NAV,
    ...Object.entries(SECTION_TABS).flatMap(([key, tabs]) => tabs.map((tab) => ({ key, href: tab.href }))),
  ];
  let best: { key: string; href: string } | null = null;
  for (const item of candidates) {
    const isMatch =
      item.href === "/employee" ? pathname === "/employee" : pathname === item.href || pathname.startsWith(`${item.href}/`);
    if (isMatch && (!best || item.href.length > best.href.length)) {
      best = item;
    }
  }
  return best?.key ?? "dashboard";
}
