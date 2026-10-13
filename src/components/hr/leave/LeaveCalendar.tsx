"use client";

import { useRouter, usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { LeaveRequest } from "@/types/employee";
import { stripBase, withBase } from "@/lib/portal";
import { usePortalBase } from "../usePortalBase";
import styles from "./Leave.module.css";

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];
const MAX_VISIBLE_CHIPS = 3;

function dateKey(d: Date): string {
  return d.toLocaleDateString("en-CA");
}

function inRange(day: string, request: LeaveRequest): boolean {
  return day >= request.startDate && day <= request.endDate;
}

function initialsOf(name: string): string {
  return name.split(" ").map((n) => n[0]).join("");
}

interface LeaveCalendarProps {
  requests: LeaveRequest[];
  year: number;
  month: number; // 0-indexed
}

// Month grid - each day lists who's Approved/Pending for leave that day (by
// initials, since a department can have several people out at once).
export default function LeaveCalendar({ requests, year, month }: LeaveCalendarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const base = usePortalBase();

  const today = new Date();
  const todayKey = dateKey(today);

  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingBlanks = first.getDay();
  const monthLabel = first.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth();

  const relevant = requests.filter((r) => r.status === "Approved" || r.status === "Pending");

  function goDelta(delta: number) {
    const d = new Date(year, month + delta, 1);
    router.push(withBase(base, `${stripBase(pathname)}?year=${d.getFullYear()}&month=${d.getMonth()}`));
  }

  function goToday() {
    router.push(withBase(base, `${stripBase(pathname)}?year=${today.getFullYear()}&month=${today.getMonth()}`));
  }

  const days = Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1));

  return (
    <div className={styles.calendarCard}>
      <div className={styles.calendarHeader}>
        <span className={styles.monthLabel}>{monthLabel}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {!isCurrentMonth && (
            <button type="button" className={styles.todayButton} onClick={goToday}>
              Today
            </button>
          )}
          <button type="button" className={styles.navButton} onClick={() => goDelta(-1)} aria-label="Previous month">
            <ChevronLeft size={15} />
          </button>
          <button type="button" className={styles.navButton} onClick={() => goDelta(1)} aria-label="Next month">
            <ChevronRight size={15} />
          </button>
        </div>
      </div>

      <div className={styles.calendarGrid}>
        {WEEKDAY_LABELS.map((w, i) => (
          <span className={styles.weekday} key={i}>
            {w}
          </span>
        ))}
        {Array.from({ length: leadingBlanks }).map((_, i) => (
          <div key={`blank-${i}`} className={`${styles.dayCell} ${styles.dayCellEmpty}`} />
        ))}
        {days.map((day) => {
          const key = dateKey(day);
          const onLeave = relevant.filter((r) => inRange(key, r));
          const isToday = key === todayKey;
          const isWeekend = day.getDay() === 0 || day.getDay() === 6;
          const visible = onLeave.slice(0, MAX_VISIBLE_CHIPS);
          const overflow = onLeave.slice(MAX_VISIBLE_CHIPS);
          const cellClass = [
            styles.dayCell,
            isToday ? styles.dayCellToday : isWeekend ? styles.dayCellWeekend : "",
          ]
            .filter(Boolean)
            .join(" ");
          return (
            <div className={cellClass} key={key}>
              <span className={isToday ? styles.dayNumberToday : styles.dayNumber}>{day.getDate()}</span>
              <div className={styles.dayChips}>
                {visible.map((r) => (
                  <span
                    key={r.id}
                    className={`${styles.dayChip} ${styles[r.status === "Approved" ? "dayChip-approved" : "dayChip-pending"]}`}
                    title={`${r.employeeName} - ${r.category} (${r.status})`}
                  >
                    {initialsOf(r.employeeName)}
                  </span>
                ))}
                {overflow.length > 0 && (
                  <span
                    className={styles.dayChipMore}
                    title={overflow.map((r) => `${r.employeeName} - ${r.category} (${r.status})`).join(", ")}
                  >
                    +{overflow.length}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className={styles.legend}>
        <span className={styles.legendItem}>
          <span className={styles.legendSwatch} style={{ background: "var(--color-success)" }} />
          Approved
        </span>
        <span className={styles.legendItem}>
          <span className={styles.legendSwatch} style={{ background: "var(--color-warning)" }} />
          Pending
        </span>
      </div>
    </div>
  );
}
