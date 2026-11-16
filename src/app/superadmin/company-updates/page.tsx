import type { Metadata } from "next";
import Link from "next/link";
import { Megaphone, Cake, UserPlus, Send } from "lucide-react";
import { getAnnouncements } from "@/lib/hr/announcement-store";
import { announcementStatus } from "@/lib/announcements/status";
import { getCelebrations } from "@/lib/hr/celebrations";
import { getSession } from "@/lib/auth/get-session";
import { withBase } from "@/lib/portal";
import StatTile from "@/components/hr/StatTile";
import SectionCard from "@/components/employee/SectionCard";
import styles from "@/components/hr/lifecycle/Lifecycle.module.css";

export const metadata: Metadata = {
  title: "Company Updates | HumSetu",
};

export const dynamic = "force-dynamic";

const STATUS_BADGE: Record<string, string> = {
  Published: "badgeGreen",
  Scheduled: "badgeBlue",
  Draft: "badgeGray",
  Expired: "badgeGray",
  Archived: "badgeGray",
};

export default async function CompanyUpdatesOverviewPage() {
  const [announcements, celebrations, session] = await Promise.all([
    getAnnouncements(),
    getCelebrations(),
    getSession(),
  ]);
  const base = session?.role === "HR" ? "/hr" : "/superadmin";

  const published = announcements.filter((a) => announcementStatus(a) === "Published").length;
  const scheduled = announcements.filter((a) => announcementStatus(a) === "Scheduled").length;
  const celebratingSoon = celebrations.filter((c) => c.daysUntil >= 0 && c.daysUntil <= 7).length;
  const newJoiners = celebrations.filter((c) => c.kind === "New Joiner").length;

  const recentAnnouncements = [...announcements]
    .sort((a, b) => (a.publishAt < b.publishAt ? 1 : -1))
    .slice(0, 5);
  const upcomingCelebrations = celebrations.slice(0, 5);

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 4px" }}>Company Updates</h1>
        <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: 0 }}>
          Official announcements and employee celebrations, in one place.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 14, marginBottom: 18 }}>
        <StatTile label="Published Announcements" value={published} icon={Megaphone} tone="accent" />
        <StatTile label="Scheduled Announcements" value={scheduled} icon={Send} tone="info" />
        <StatTile label="Celebrating This Week" value={celebratingSoon} icon={Cake} tone="warning" />
        <StatTile label="New Joiners (30 days)" value={newJoiners} icon={UserPlus} tone="success" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 16 }}>
        <SectionCard
          title="Recent Announcements"
          action={
            <Link href={withBase(base, "/company-updates/announcements")} style={{ fontSize: 12, fontWeight: 600, color: "var(--color-hr-accent)" }}>
              View All →
            </Link>
          }
        >
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Type</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentAnnouncements.map((a) => {
                  const status = announcementStatus(a);
                  return (
                    <tr key={a.id}>
                      <td>
                        <Link
                          href={withBase(base, `/company-updates/announcements/${a.id}`)}
                          style={{ fontWeight: 600, color: "var(--color-text)", textDecoration: "none" }}
                        >
                          {a.title}
                        </Link>
                      </td>
                      <td className={styles.muted}>{a.type}</td>
                      <td>
                        <span className={`${styles.badge} ${styles[STATUS_BADGE[status] ?? "badgeGray"]}`}>{status}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {recentAnnouncements.length === 0 && <div className={styles.empty}>No announcements yet.</div>}
          </div>
        </SectionCard>

        <SectionCard
          title="Upcoming Celebrations"
          action={
            <Link href={withBase(base, "/company-updates/celebrations")} style={{ fontSize: 12, fontWeight: 600, color: "var(--color-hr-accent)" }}>
              View All →
            </Link>
          }
        >
          {upcomingCelebrations.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--color-text-muted)" }}>Nothing coming up.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {upcomingCelebrations.map((c) => (
                <div key={c.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 13 }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{c.name}</div>
                    <div className={styles.muted}>{c.kind}{c.detail && c.kind === "Work Anniversary" ? ` · ${c.detail}` : ""}</div>
                  </div>
                  <span className={styles.muted}>{c.dateLabel}</span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </>
  );
}
