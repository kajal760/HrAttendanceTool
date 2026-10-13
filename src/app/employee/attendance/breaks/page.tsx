import type { Metadata } from "next";
import { getTimesheetLog } from "@/lib/employee/mock-data";
import SectionCard from "@/components/employee/SectionCard";
import TodayBreaksList from "@/components/employee/TodayBreaksList";
import DateRangeFilter from "@/components/employee/DateRangeFilter";
import BreakTotalsTable from "@/components/employee/BreakTotalsTable";

export const metadata: Metadata = {
  title: "Breaks | HR Attendance",
};

type SearchParams = { from?: string; to?: string };

export default async function EmployeeBreaksPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const from = params.from ?? "";
  const to = params.to ?? "";

  const all = await getTimesheetLog();
  const entries = all.filter((e) => (!from || e.date >= from) && (!to || e.date <= to));

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 4px" }}>Breaks</h1>
        <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: 0 }}>
          Today&apos;s break timeline, and how much break time you&apos;ve logged on previous days.
        </p>
      </div>

      <div style={{ marginBottom: 16 }}>
        <SectionCard title="Today">
          <TodayBreaksList />
        </SectionCard>
      </div>

      <SectionCard title="Daily break totals" subtitle="Filter by date">
        <DateRangeFilter from={from} to={to} />
        <BreakTotalsTable entries={entries} />
      </SectionCard>
    </>
  );
}
