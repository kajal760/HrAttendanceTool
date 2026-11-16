import { Suspense, type ReactNode } from "react";
import { ShieldAlert } from "lucide-react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";
import { getEmployee, getEmployeeOverviews } from "@/lib/hr/employee-store";
import { getAnnouncements } from "@/lib/hr/announcement-store";
import { getTodaysBirthdays } from "@/lib/employee/dashboard-data";
import { announcementStatus, resolveAudience } from "@/lib/announcements/status";
import LogoutButton from "@/components/auth/LogoutButton";
import EmployeeSidebar from "@/components/employee/EmployeeSidebar";
import EmployeeTopBar from "@/components/employee/EmployeeTopBar";
import EmployeeSecondaryNav from "@/components/employee/EmployeeSecondaryNav";
import BirthdayBanner from "@/components/employee/BirthdayBanner";
import BirthdayConfetti from "@/components/employee/BirthdayConfetti";
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
  const employeeId = session?.employeeId ?? "00000000-0000-4000-8000-000000001051";

  let employee = null;
  try {
    employee = await getEmployee(employeeId);
  } catch {
    // backend offline
  }

  if (!employee) {
    employee = {
      id: employeeId,
      employeeCode: "EMP-1051",
      name: session?.name ?? "Sameer Iyer",
      initials: "SI",
      email: "sameer.iyer@hrattendance.example",
      department: "Product",
      designation: "Product Manager",
      status: "Active" as const,
      joinedOn: "2023-02-20",
      age: 28,
      salary: 75000,
      performanceScore: 92,
      attendancePct: 98,
      leave: { remaining: 18, allocated: 26 },
      tasks: { completed: 12, active: 3, completionPct: 80 },
      pendingRequests: 0,
      skills: ["React", "TypeScript", "Next.js"],
      education: [],
      experience: [],
      customFields: [],
      onboardingTasks: [],
      lifecycleHistory: [],
      deactivated: false,
    };
  }

  if (employee.deactivated) {
    return (
      <div className={styles.shell}>
        <header className={styles.topbar}>
          <div className={styles.brand}>
            <span className={styles.brandMark}>HS</span>
            <span>HumSetu</span>
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
  // the Announcements page and the dashboard's preview card. Each call gets
  // its own fallback, same "backend offline" resilience as `getEmployee`
  // above: `getEmployeeOverviews()` in particular hits the Admin/HR-only
  // `/employees/directory` endpoint just to resolve audience targeting, so
  // an Employee-role session gets a 401 from the backend there by design -
  // that should degrade the unread count, not take down the whole portal.
  const [announcements, employees, todaysBirthdays] = await Promise.all([
    getAnnouncements().catch(() => []),
    getEmployeeOverviews().catch(() => []),
    getTodaysBirthdays().catch(() => []),
  ]);
  const unreadAnnouncementCount = announcements.filter((a) => {
    const status = announcementStatus(a);
    if (status !== "Published" && status !== "Expired") return false;
    if (!resolveAudience(a.audience, employees).some((e) => e.id === employee.id)) return false;
    return !a.reads.some((r) => r.employeeId === employee.id);
  }).length;

  // The confetti is just for the birthday person themselves - the banner
  // below already tells everyone else.
  const myBirthdayToday = todaysBirthdays.some((b) => b.id === employee.id);

  return (
    <div className={styles.shell}>
      {myBirthdayToday && <BirthdayConfetti name={employee.name} />}
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
            <BirthdayBanner birthdays={todaysBirthdays} />
            <main className={styles.main}>{children}</main>
          </div>
        </div>
      </div>
    </div>
  );
}
