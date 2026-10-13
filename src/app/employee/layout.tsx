import { Suspense, type ReactNode } from "react";
import { ShieldAlert } from "lucide-react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";
import { getEmployee, getEmployeeOverviews } from "@/lib/hr/employee-store";
import { getAnnouncements } from "@/lib/hr/announcement-store";
import { announcementStatus, resolveAudience } from "@/lib/announcements/status";
import LogoutButton from "@/components/auth/LogoutButton";
import EmployeeSidebar from "@/components/employee/EmployeeSidebar";
import EmployeeTopBar from "@/components/employee/EmployeeTopBar";
import EmployeeSecondaryNav from "@/components/employee/EmployeeSecondaryNav";
import BirthdayBanner from "@/components/employee/BirthdayBanner";
import styles from "./layout.module.css";

export const dynamic = "force-dynamic";

// Two-tier shell - a full-width top bar (brand/period filter/notifications/
// profile) and a vertical icon sidebar for the module's sections - same
// pattern as the Super Admin portal's layout, recolored to this module's
// teal identity (see layout.module.css).
//
// `proxy.ts` already keeps non-Employee/unauthenticated requests out of
// /employee - the re-checks below are defense in depth (see the Proxy
// docs' own guidance: verify auth in the route, don't rely on Proxy alone).
export default async function EmployeeLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  if (!session?.employeeId) redirect("/login");

  // Reads the same Employee Master record the Super Admin side manages, so a
  // super admin deactivating this account locks the employee out on their
  // very next request.
  const employee = await getEmployee(session.employeeId);
  if (!employee) redirect("/login");

  if (employee.deactivated) {
    return (
      <div className={styles.shell}>
        <header className={styles.topbar}>
          <div className={styles.brand}>
            <span className={styles.brandMark}>HR</span>
            <span>HR Attendance</span>
          </div>
          <LogoutButton className={styles.logoutButton} />
        </header>
        <main className={styles.main}>
          <div className={styles.accessDenied}>
            <ShieldAlert size={28} strokeWidth={1.75} />
            <h1 className={styles.accessDeniedTitle}>Permission denied</h1>
            <p className={styles.accessDeniedText}>
              Your account has been deactivated. Please contact the HR team for assistance.
            </p>
          </div>
        </main>
      </div>
    );
  }

  // Unread-announcement count for the bell - same visibility rule used on
  // the Announcements page and the dashboard's preview card.
  const [announcements, employees] = await Promise.all([getAnnouncements(), getEmployeeOverviews()]);
  const unreadAnnouncementCount = announcements.filter((a) => {
    const status = announcementStatus(a);
    if (status !== "Published" && status !== "Expired") return false;
    if (!resolveAudience(a.audience, employees).some((e) => e.id === employee.id)) return false;
    return !a.reads.some((r) => r.employeeId === employee.id);
  }).length;

  return (
    <div className={styles.shell}>
      <EmployeeTopBar
        name={employee.name}
        initials={employee.initials}
        photoUrl={employee.photoUrl}
        unreadAnnouncementCount={unreadAnnouncementCount}
      />
      <div className={styles.body}>
        <EmployeeSidebar />
        <div className={styles.content}>
          <Suspense fallback={null}>
            <EmployeeSecondaryNav />
          </Suspense>
          <div className={styles.mainScroll}>
            <BirthdayBanner />
            <main className={styles.main}>{children}</main>
          </div>
        </div>
      </div>
    </div>
  );
}
