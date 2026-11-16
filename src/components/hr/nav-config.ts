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
// Roles & Permissions isn't in that BRD list either, but it's promoted into
// the primary group (right after Dashboard) since access control is a
// frequent, not a secondary, admin task. Work & Projects, Announcements,
// Log, Settings, and Tickets stay reachable as a secondary ("more") group
// below a divider - same precedent as the employee portal's SECONDARY_NAV.

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
  BarChart3,
  Briefcase,
  Megaphone,
  ShieldCheck,
  ShieldAlert,
  History,
  Settings,
  Ticket,
  GraduationCap,
} from "lucide-react";
import { stripBase } from "@/lib/portal";
import type { Role } from "@/types/auth";

export interface SidebarSection {
  key: string;
  label: string;
  href: string;
  icon: LucideIcon;
  enabled: boolean;
  group: "primary" | "more";
}

// Order below matches the agreed sidebar order exactly (Dashboard through
// Ticket/Support). Both groups stay "primary" then "more" split at the
// Log/Settings boundary - `HrSidebar` sinks disabled items (Performance,
// Analytics) to the bottom of whichever group they're in, which is why they
// sit in "primary" right after Log rather than in "more": that's what lands
// them between Log and the divider instead of at the very end of the list.
export const SIDEBAR_SECTIONS: SidebarSection[] = [
  { key: "home", label: "Dashboard", href: "/", icon: LayoutDashboard, enabled: true, group: "primary" },
  { key: "employees", label: "Employees", href: "/employees", icon: Users, enabled: true, group: "primary" },
  { key: "training", label: "Training", href: "/training", icon: GraduationCap, enabled: true, group: "primary" },
  { key: "roles", label: "Roles & Permissions", href: "/employees/roles", icon: ShieldCheck, enabled: true, group: "primary" },
  { key: "attendance", label: "Attendance", href: "/attendance", icon: CalendarCheck, enabled: true, group: "primary" },
  { key: "leave", label: "Leave", href: "/leave", icon: CalendarDays, enabled: true, group: "primary" },
  { key: "timesheets", label: "Timesheet Management", href: "/timesheets", icon: Clock, enabled: true, group: "primary" },
  { key: "assets", label: "Assets", href: "/assets", icon: Package, enabled: true, group: "primary" },
  { key: "lifecycle", label: "Lifecycle", href: "/lifecycle", icon: Route, enabled: true, group: "primary" },
  { key: "updates", label: "Company Updates", href: "/company-updates", icon: Megaphone, enabled: true, group: "primary" },
  { key: "work", label: "Work & Projects", href: "/work", icon: Briefcase, enabled: true, group: "primary" },
  { key: "posh", label: "POSH Management", href: "/posh", icon: ShieldAlert, enabled: true, group: "primary" },
  { key: "log", label: "Log", href: "/log", icon: History, enabled: true, group: "primary" },
  { key: "performance", label: "Performance", href: "/performance", icon: TrendingUp, enabled: false, group: "primary" },
  { key: "analytics", label: "Analytics", href: "/analytics", icon: BarChart3, enabled: false, group: "primary" },

  { key: "settings", label: "Settings", href: "/settings", icon: Settings, enabled: true, group: "more" },
  { key: "tickets", label: "Ticket / Support", href: "/tickets", icon: Ticket, enabled: true, group: "more" },
];

export interface SecondaryTab {
  label: string;
  href: string;
  enabled: boolean;
  // Admin (Super Admin) isn't an employee being tracked, so tabs about the
  // *signed-in user's own* clock-in/out never show for that role - only HR
  // self-tracks their attendance here. Omit for tabs every role should see.
  hideForRole?: Role[];
}

export const SECTION_TABS: Record<string, SecondaryTab[]> = {
  // Org Structure lives only here (next to Reports) as a dashboard
  // shortcut - deliberately not duplicated into the Employees tab list
  // below, even though the page itself is under /employees/org.
  home: [
    { label: "Dashboard", href: "/", enabled: true },
    { label: "Org Structure", href: "/employees/org", enabled: true },
    { label: "Reports", href: "/reports", enabled: true },
  ],
  employees: [
    { label: "Dashboard", href: "/employees", enabled: true },
    { label: "Employee Directory", href: "/employees/directory", enabled: true },
    { label: "Department & Designation", href: "/employees/department", enabled: true },
  ],
  attendance: [
    { label: "Today", href: "/attendance", enabled: true },
    { label: "Attendance History", href: "/attendance/daily", enabled: true },
    { label: "Corrections", href: "/attendance/corrections", enabled: true },
  ],
  leave: [
    { label: "Leave Overview", href: "/leave", enabled: true },
    { label: "Leave Requests", href: "/leave/requests", enabled: true },
    { label: "Leave Balance", href: "/leave/balance", enabled: true },
    { label: "Leave Calendar", href: "/leave/calendar", enabled: true },
    { label: "Leave Policies", href: "/leave/policy", enabled: true },
  ],
  timesheets: [{ label: "Timesheet Overview", href: "/timesheets", enabled: true }],
  assets: [
    { label: "Dashboard", href: "/assets", enabled: true },
    { label: "Asset Inventory", href: "/assets/inventory", enabled: true },
    { label: "Allocation", href: "/assets/allocation", enabled: true },
    { label: "Returns", href: "/assets/returns", enabled: true },
    { label: "Maintenance", href: "/assets/maintenance", enabled: true },
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
  // Just the one entry - the in-page "Module" dropdown in `SystemLogViewer`
  // already covers filtering by module, so a tab per module here would be a
  // second, redundant control for the same thing.
  log: [{ label: "Activity Log", href: "/log", enabled: true }],
  work: [
    { label: "Projects", href: "/work", enabled: true },
    { label: "Tasks", href: "/work/tasks", enabled: true },
  ],
  // Announcements and Celebrations used to be separate top-level sections -
  // combined here since they're both "things everyone sees about the
  // company," per the agreed sidebar structure (Overview / Announcements /
  // Celebrations / Events Calendar).
  updates: [
    { label: "Overview", href: "/company-updates", enabled: true },
    { label: "Announcements", href: "/company-updates/announcements", enabled: true },
    { label: "Celebrations", href: "/company-updates/celebrations", enabled: true },
    { label: "Events Calendar", href: "/company-updates/events", enabled: true },
  ],
  training: [
    { label: "Programmes", href: "/training", enabled: true },
    { label: "Assigned Trainings", href: "/training/assigned", enabled: true },
    { label: "Progress", href: "/training/progress", enabled: true },
    { label: "Certifications", href: "/training/certifications", enabled: true },
    { label: "Reports", href: "/training/reports", enabled: true },
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
