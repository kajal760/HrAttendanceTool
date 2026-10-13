import type { UpcomingBirthday } from "@/types/employee";
import styles from "./BirthdayList.module.css";

function formatDaysUntil(daysUntil: number): string {
  if (daysUntil === 0) return "Today";
  if (daysUntil === 1) return "Tomorrow";
  return `In ${daysUntil} days`;
}

interface BirthdayListProps {
  items: UpcomingBirthday[];
}

export default function BirthdayList({ items }: BirthdayListProps) {
  if (items.length === 0) {
    return <span style={{ fontSize: 13, color: "var(--color-text-muted)" }}>No upcoming birthdays.</span>;
  }

  return (
    <div className={styles.list}>
      {items.map((person) => (
        <div className={styles.item} key={person.id}>
          <span className={styles.avatar}>{person.initials}</span>
          <div className={styles.body}>
            <span className={styles.name}>{person.name}</span>
            <span className={styles.meta}>{person.department}</span>
          </div>
          {person.isToday ? (
            <span className={styles.todayTag}>🎂 Today</span>
          ) : (
            <span className={styles.meta}>{formatDaysUntil(person.daysUntil)}</span>
          )}
        </div>
      ))}
    </div>
  );
}
