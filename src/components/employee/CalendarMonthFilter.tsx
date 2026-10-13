"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import styles from "./CalendarMonthFilter.module.css";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

interface CalendarMonthFilterProps {
  year: number;
  month: number; // 0-indexed
}

// URL-driven month/year filter (?year=&month=) - the calendar's data comes
// from the server per requested month, so navigating here is a real
// navigation (router.push), not client-only state. Uses the current route
// (not a hardcoded path) so it works wherever it's rendered (Attendance
// History, or any other page that embeds the calendar), and preserves any
// other params already on the URL (e.g. a `DateRangeFilter`'s from/to).
export default function CalendarMonthFilter({ year, month }: CalendarMonthFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const now = new Date();
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();

  function go(nextYear: number, nextMonth: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("year", String(nextYear));
    params.set("month", String(nextMonth));
    router.push(`${pathname}?${params.toString()}`);
  }

  function goDelta(delta: number) {
    const d = new Date(year, month + delta, 1);
    go(d.getFullYear(), d.getMonth());
  }

  const years = Array.from({ length: 6 }, (_, i) => now.getFullYear() - 3 + i);

  return (
    <div className={styles.filter}>
      <button type="button" className={styles.arrowButton} onClick={() => goDelta(-1)} aria-label="Previous month">
        <ChevronLeft size={16} strokeWidth={2} />
      </button>

      <select className={styles.select} value={month} onChange={(e) => go(year, Number(e.target.value))} aria-label="Month">
        {MONTH_NAMES.map((name, i) => (
          <option key={name} value={i}>
            {name}
          </option>
        ))}
      </select>

      <select className={styles.select} value={year} onChange={(e) => go(Number(e.target.value), month)} aria-label="Year">
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>

      <button type="button" className={styles.arrowButton} onClick={() => goDelta(1)} aria-label="Next month">
        <ChevronRight size={16} strokeWidth={2} />
      </button>

      {!isCurrentMonth && (
        <button type="button" className={styles.todayButton} onClick={() => go(now.getFullYear(), now.getMonth())}>
          Today
        </button>
      )}
    </div>
  );
}
