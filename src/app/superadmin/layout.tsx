import { Suspense, type ReactNode } from "react";
import { redirect } from "next/navigation";
import { getHrDashboardData } from "@/lib/hr/mock-data";
import { getSession } from "@/lib/auth/get-session";
import HrTopBar from "@/components/hr/HrTopBar";
import HrSidebar from "@/components/hr/HrSidebar";
import HrSecondaryNav from "@/components/hr/HrSecondaryNav";
import styles from "./layout.module.css";

// Two-tier nav: a full-width top bar (brand/search/notifications/profile),
// a vertical icon sidebar for top-level module areas, and a horizontal
// secondary nav for sections within whichever area is active.
export default async function HrLayout({ children }: { children: ReactNode }) {
  // `proxy.ts` already keeps Employee-role/unauthenticated requests out of
  // /superadmin - this re-check is defense in depth (see the Proxy docs'
  // own guidance: verify auth in the route, don't rely on Proxy alone).
  const session = await getSession();
  if (!session || session.role === "Employee") redirect("/login");

  const { pendingRequestCount } = await getHrDashboardData();

  return (
    <div className={styles.shell}>
      <HrTopBar pendingRequestCount={pendingRequestCount} userName={session.name} />
      <div className={styles.body}>
        <HrSidebar pendingRequestCount={pendingRequestCount} />
        <div className={styles.content}>
          <Suspense fallback={null}>
            <HrSecondaryNav />
          </Suspense>
          <div className={styles.mainScroll}>
            <main className={styles.main}>{children}</main>
          </div>
        </div>
      </div>
    </div>
  );
}
