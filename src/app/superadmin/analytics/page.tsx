import type { Metadata } from "next";
import { getDailyRecords, todayIso } from "@/lib/hr/attendance-daily";
import SectionCard from "@/components/employee/SectionCard";
import StatusBreakdownChart from "@/components/hr/charts/StatusBreakdownChart";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Analytics | HumSetu",
};

export default async function AnalyticsPage() {
  const date = todayIso();
  const records = await getDailyRecords(date);

  const counts = new Map<string, number>();
  for (const r of records) counts.set(r.status, (counts.get(r.status) ?? 0) + 1);
  const slices = [...counts.entries()].map(([label, value]) => ({ label, value }));

  return (
    <>
      <div className={styles.pageHeader}>
        <h1 className={styles.title}>Analytics</h1>
        <p className={styles.subtitle}>Company-wide attendance trends, powered by Chart.js.</p>
      </div>

      <SectionCard title="Today's attendance status" subtitle={date}>
        {slices.length > 0 ? (
          <div className={styles.chartBox}>
            <StatusBreakdownChart data={slices} />
          </div>
        ) : (
          <p className={styles.empty}>No records for today (weekend).</p>
        )}
      </SectionCard>
    </>
  );
}
