import Link from "next/link";
import { Plus } from "lucide-react";
import type { CompanyHoliday, LeaveTypeBalance } from "@/types/employee";
import styles from "./LeaveHolidaysCard.module.css";

function formatDay(iso: string): { day: string; month: string } {
  const d = new Date(iso);
  return {
    day: d.toLocaleDateString(undefined, { day: "2-digit" }),
    month: d.toLocaleDateString(undefined, { month: "short" }),
  };
}

interface LeaveHolidaysCardProps {
  balances: LeaveTypeBalance[];
  holidays: CompanyHoliday[];
}

export default function LeaveHolidaysCard({ balances, holidays }: LeaveHolidaysCardProps) {
  return (
    <div>
      <div className={styles.balanceRow}>
        {balances.map((b) => (
          <div className={styles.balanceChip} key={b.type}>
            <span className={styles.balanceValue}>{b.remaining}</span>
            <span className={styles.balanceLabel}>{b.type.replace(" Leave", "")}</span>
          </div>
        ))}
      </div>

      <p className={styles.sectionLabel}>Upcoming holidays</p>
      <div className={styles.holidayList}>
        {holidays.map((h) => {
          const { day, month } = formatDay(h.date);
          return (
            <div className={styles.holidayRow} key={h.id}>
              <span className={styles.holidayDate}>
                <span className={styles.holidayDay}>{day}</span>
                <span className={styles.holidayMonth}>{month}</span>
              </span>
              <div className={styles.holidayBody}>
                <span className={styles.holidayName}>{h.name}</span>
                <span className={styles.holidayType}>{h.type} holiday</span>
              </div>
            </div>
          );
        })}
      </div>

      <Link href="/employee/leave/apply" className={styles.applyButton}>
        <Plus size={15} strokeWidth={2.5} />
        Apply Leave
      </Link>
    </div>
  );
}
