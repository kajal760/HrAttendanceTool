import type { Metadata } from "next";
import { getCompanyHolidays } from "@/lib/hr/holidays";
import { getCompanyEvents } from "@/lib/employee/dashboard-data";
import { formatDay } from "@/lib/hr/attendance-format";
import EventsWidget from "@/components/employee/EventsWidget";
import SectionCard from "@/components/employee/SectionCard";
import styles from "@/components/hr/lifecycle/Lifecycle.module.css";

export const metadata: Metadata = {
  title: "Events Calendar | HumSetu",
};

export const dynamic = "force-dynamic";

export default async function EventsCalendarPage() {
  const [holidays, events] = await Promise.all([getCompanyHolidays(), getCompanyEvents()]);
  // "Optional" (regional/restricted) holidays are the festival calendar -
  // "Public" (bank) holidays already have their own place on the Leave
  // module's Holidays page.
  const festivals = holidays.filter((h) => h.type === "Optional");

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 4px" }}>Events Calendar</h1>
        <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: 0 }}>
          Festival celebrations and company events across the year.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
        <SectionCard title="Festival celebrations" subtitle="Regional / restricted holidays">
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Festival</th>
                </tr>
              </thead>
              <tbody>
                {festivals.map((h) => (
                  <tr key={h.id}>
                    <td className={styles.muted}>{formatDay(h.date)}</td>
                    <td style={{ fontWeight: 600 }}>{h.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {festivals.length === 0 && <div className={styles.empty}>No festival dates recorded.</div>}
          </div>
        </SectionCard>

        <SectionCard title="Company events" subtitle="Townhalls, team outings, training, celebrations">
          <EventsWidget events={events} />
        </SectionCard>
      </div>
    </>
  );
}
