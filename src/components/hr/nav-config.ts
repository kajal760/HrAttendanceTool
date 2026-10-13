// Single source of truth for the super admin module's two-tier nav: which
// top-level sidebar section is active decides which horizontal secondary
// tabs show, so the two stay in sync instead of drifting apart.
//
// Every href here is BASE-RELATIVE ("/", "/employees", ...), not prefixed
// with "/superadmin" - HR and Admin see this exact same nav, just under a
// different URL base ("/hr" vs "/superadmin", see `src/lib/portal.ts`).
// `HrSidebar`/`HrSecondaryNav` turn a relative href into a real one via
// `withBase(currentBase, href)`.
//
// Sections follow the BRD's HR module structure: Dashboard, Employees,
// Attendance, Leave, Timesheets, Performance, Assets, Lifecycle,
// Celebrations, Analytics are the primary groups (`group: "primary"`).
// Work & Projects, Announcements, Roles & Permissions, Log, Settings, and
// Tickets aren't in that BRD list but are working features, so they stay
// reachable as a secondary ("more") group below a divider - same
// precedent as the employee portal's SECONDARY_NAV.

import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  CalendarDays,
  Clock,
  TrendingUp,
  Package,
  Route,
  Cake,
  BarChart3,
  Briefcase,
  Megaphone,
  ShieldCheck,
  History,
  Settings,
  Ticket,
} from "lucide-react";
import { stripBase } from "@/lib/portal";

export interface SidebarSection {
  key: string;
  label: string;
  href: string;
  icon: LucideIcon;
  enabled: boolean;
  group: "primary" | "more";
}

export const SIDEBAR_SECTIONS: SidebarSection[] = [
  { key: "home", label: "Dashboard", href: "/", icon: LayoutDashboard, enabled: true, group: "primary" },
  { key: "employees", label: "Employees", href: "/employees", icon: Users, enabled: true, group: "primary" },
  { key: "attendance", label: "Attendance", href: "/attendance", icon: CalendarCheck, enabled: true, group: "primary" },
  { key: "leave", label: "Leave", href: "/leave", icon: CalendarDays, enabled: true, group: "primary" },
  { key: "timesheets", label: "Timesheets", href: "/timesheets", icon: Clock, enabled: true, group: "primary" },
  { key: "performance", label: "Performance", href: "/performance", icon: TrendingUp, enabled: false, group: "primary" },
  { key: "assets", label: "Assets", href: "/assets", icon: Package, enabled: true, group: "primary" },
  { key: "lifecycle", label: "Lifecycle", href: "/lifecycle", icon: Route, enabled: true, group: "primary" },
  { key: "celebrations", label: "Celebrations", href: "/celebrations", icon: Cake, enabled: true, group: "primary" },
  { key: "analytics", label: "Analytics", href: "/analytics", icon: BarChart3, enabled: false, group: "primary" },

  { key: "work", label: "Work & Projects", href: "/work", icon: Briefcase, enabled: true, group: "more" },
  { key: "announcements", label: "Announcements", href: "/announcements", icon: Megaphone, enabled: true, group: "more" },
  { key: "roles", label: "Roles & Permissions", href: "/employees/roles", icon: ShieldCheck, enabled: true, group: "more" },
  { key: "log", label: "Log", href: "/log", icon: History, enabled: true, group: "more" },
  { key: "settings", label: "Settings", href: "/settings", icon: Settings, enabled: false, group: "more" },
  { key: "tickets", label: "Tickets", href: "/tickets", icon: Ticket, enabled: false, group: "more" },
];

export interface SecondaryTab {
  label: string;
  href: string;
  enabled: boolean;
}

export const SECTION_TABS: Record<string, SecondaryTab[]> = {
  home: [
    { label: "Dashboard", href: "/", enabled: true },
    { label: "Reports", href: "/reports", enabled: true },
  ],
  employees: [
    { label: "Employee Directory", href: "/employees", enabled: true },
    { label: "Employee Master", href: "/employees/master", enabled: true },
    { label: "Departments", href: "/employees/department", enabled: true },
    { label: "Designations", href: "/employees/designations", enabled: true },
    { label: "Org Structure", href: "/employees/org", enabled: true },
  ],
  attendance: [
    { label: "Today", href: "/attendance", enabled: true },
    { label: "Attendance History", href: "/attendance/daily", enabled: true },
    { label: "Late Check-ins", href: "/attendance/late", enabled: true },
    { label: "Corrections", href: "/attendance/corrections", enabled: true },
    { label: "My Clock History", href: "/attendance/my-history", enabled: true },
  ],
  leave: [
    { label: "Leave Requests", href: "/leave", enabled: true },
    { label: "Leave Balance", href: "/leave/balance", enabled: true },
    { label: "Leave History", href: "/leave/history", enabled: true },
    { label: "Leave Calendar", href: "/leave/calendar", enabled: true },
    { label: "Leave Policy", href: "/leave/policy", enabled: true },
  ],
  timesheets: [
    { label: "Employee Timesheets", href: "/timesheets", enabled: true },
    { label: "Working Hours", href: "/timesheets/hours", enabled: true },
    { label: "Breaks", href: "/timesheets/breaks", enabled: true },
    { label: "Task Distribution", href: "/timesheets/tasks", enabled: true },
  ],
  assets: [
    { label: "Asset Inventory", href: "/assets", enabled: true },
    { label: "Allocation", href: "/assets/allocation", enabled: true },
    { label: "Returns", href: "/assets/returns", enabled: true },
    { label: "Asset History", href: "/assets/history", enabled: true },
  ],
  lifecycle: [
    { label: "Joining", href: "/lifecycle", enabled: true },
    { label: "Onboarding", href: "/lifecycle/onboarding", enabled: true },
    { label: "Confirmation", href: "/lifecycle/confirmation", enabled: true },
    { label: "Transfer & Promotion", href: "/lifecycle/changes", enabled: true },
    { label: "Role Change", href: "/lifecycle/role-change", enabled: true },
    { label: "Separation", href: "/lifecycle/separation", enabled: true },
    { label: "Full & Final", href: "/lifecycle/fnf", enabled: true },
  ],
  celebrations: [
    { label: "Birthdays", href: "/celebrations", enabled: true },
    { label: "Anniversaries", href: "/celebrations/anniversaries", enabled: true },
    { label: "Email Settings", href: "/celebrations/settings", enabled: true },
  ],
  // Just the one entry - the in-page "Module" dropdown in `SystemLogViewer`
  // already covers filtering by module, so a tab per module here would be a
  // second, redundant control for the same thing.
  log: [{ label: "Activity Log", href: "/log", enabled: true }],
  work: [
    { label: "Projects", href: "/work", enabled: true },
    { label: "Tasks", href: "/work/tasks", enabled: true },
    { label: "Workload", href: "/work/workload", enabled: true },
  ],
  // Same "one route, tab = shortcut for a query-param filter" pattern as
  // Log's module tabs - Creator/Type/Priority stay as in-page filters (see
  // `AnnouncementList`) rather than becoming tabs too.
  announcements: [
    { label: "All", href: "/announcements", enabled: true },
    { label: "Published", href: "/announcements?status=Published", enabled: true },
    { label: "Scheduled", href: "/announcements?status=Scheduled", enabled: true },
    { label: "Drafts", href: "/announcements?status=Draft", enabled: true },
    { label: "Archived", href: "/announcements?status=Archived", enabled: true },
  ],
};

// Longest-href match wins, so a sub-route like "/log" doesn't fall back to
// matching Dashboard's "/" prefix. Strips whichever base ("/hr" or
// "/superadmin") is present first, since every href above is relative.
export function findActiveSectionKey(pathname: string): string {
  const relative = stripBase(pathname);
  let best: SidebarSection | null = null;
  for (const section of SIDEBAR_SECTIONS) {
    const isMatch =
      section.href === "/" ? relative === "/" : relative === section.href || relative.startsWith(`${section.href}/`);
    if (isMatch && (!best || section.href.length > best.href.length)) {
      best = section;
    }
  }
  return best?.key ?? "home";
}
