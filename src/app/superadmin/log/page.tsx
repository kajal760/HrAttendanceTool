import type { Metadata } from "next";
import { getSystemLogs } from "@/lib/superadmin/log-store";
import SystemLogViewer from "@/components/hr/SystemLogViewer";
import type { LogModule } from "@/types/log";

export const metadata: Metadata = {
  title: "System Log | HR Attendance",
};

// The log store is live, mutable, in-memory (+ file-backed export events)
// state - never prerender a stale snapshot of it at build time.
export const dynamic = "force-dynamic";

// What each horizontal tab actually shows - keeps the page description
// honest about the module you're looking at instead of one generic blurb.
const MODULE_DESCRIPTIONS: Record<LogModule | "All", string> = {
  All: "All system activities in one place.",
  Authentication: "Login, logout, failed login, session expiry, and password changes.",
  Account: "Profile changes, employee information changes, and account activation/deactivation.",
  Employees: "Employee added, edited, transferred, onboarding/offboarding, and document changes.",
  "Work & Projects": "Project created/updated/closed, task assigned/reassigned/completed.",
  Announcements: "Announcements created, edited, published, scheduled, and archived.",
  Attendance: "Clock-in/out, attendance correction, WFH changes, location/geofence events.",
  Requests: "Leave, WFH, attendance correction, and access requests and their approvals/rejections.",
  "Access & Permissions": "Role changes, permission changes, access granted/revoked.",
  Export: "Who exported what data, when, and export status.",
};

function isLogModule(value: string): value is LogModule {
  return value in MODULE_DESCRIPTIONS && value !== "All";
}

interface SuperAdminLogPageProps {
  searchParams: Promise<{ module?: string }>;
}

export default async function SuperAdminLogPage({ searchParams }: SuperAdminLogPageProps) {
  const [initialLogs, { module }] = await Promise.all([getSystemLogs(), searchParams]);
  const activeModule = module && isLogModule(module) ? module : "All";

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 4px" }}>System Log</h1>
        <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: 0 }}>
          {MODULE_DESCRIPTIONS[activeModule]} Refreshed automatically every 5 minutes.
        </p>
      </div>
      <SystemLogViewer key={activeModule} initialLogs={initialLogs} initialModuleFilter={activeModule} />
    </>
  );
}
