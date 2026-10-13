import type { UpcomingAnniversary } from "@/lib/hr/anniversaries";
import styles from "@/components/employee/BirthdayList.module.css";

function formatDaysUntil(daysUntil: number): string {
  if (daysUntil === 0) return "Today";
  if (daysUntil === 1) return "Tomorrow";
  return `In ${daysUntil} days`;
}

interface AnniversaryListProps {
  items: UpcomingAnniversary[];
}

// Mirrors the employee portal's `BirthdayList`, same stylesheet - just for
// work anniversaries, with the year count shown instead of a plain date.
export default function AnniversaryList({ items }: AnniversaryListProps) {
  if (items.length === 0) {
    return <span style={{ fontSize: 13, color: "var(--color-text-muted)" }}>No upcoming work anniversaries.</span>;
  }

  return (
    <div className={styles.list}>
      {items.map((person) => (
        <div className={styles.item} key={person.id}>
          <span className={styles.avatar}>{person.initials}</span>
          <div className={styles.body}>
            <span className={styles.name}>{person.name}</span>
            <span className={styles.meta}>
              {person.department} &middot; {person.years} yr{person.years === 1 ? "" : "s"}
            </span>
          </div>
          {person.isToday ? (
            <span className={styles.todayTag}>🎉 Today</span>
          ) : (
            <span className={styles.meta}>{formatDaysUntil(person.daysUntil)}</span>
          )}
        </div>
      ))}
    </div>
  );
}
