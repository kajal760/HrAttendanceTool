import { Megaphone, Users, GraduationCap, PartyPopper } from "lucide-react";
import type { CompanyEvent } from "@/types/employee";
import styles from "./EventsWidget.module.css";

const CATEGORY: Record<CompanyEvent["category"], { Icon: typeof Megaphone; cls: string }> = {
  Townhall: { Icon: Megaphone, cls: "thumb-townhall" },
  "Team Outing": { Icon: Users, cls: "thumb-teamoutings" },
  Training: { Icon: GraduationCap, cls: "thumb-training" },
  Celebration: { Icon: PartyPopper, cls: "thumb-celebration" },
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { weekday: "short", day: "2-digit", month: "short" });
}

interface EventsWidgetProps {
  events: CompanyEvent[];
}

export default function EventsWidget({ events }: EventsWidgetProps) {
  if (events.length === 0) {
    return <span style={{ fontSize: 13, color: "var(--color-text-muted)" }}>No upcoming events.</span>;
  }

  return (
    <div className={styles.list}>
      {events.map((event) => {
        const { Icon, cls } = CATEGORY[event.category];
        return (
          <div className={styles.row} key={event.id}>
            <span className={`${styles.thumb} ${styles[cls]}`}>
              <Icon size={16} strokeWidth={1.75} />
            </span>
            <div className={styles.body}>
              <span className={styles.title}>{event.title}</span>
              <span className={styles.meta}>
                {formatDate(event.date)}
                {event.location ? ` · ${event.location}` : ""}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
