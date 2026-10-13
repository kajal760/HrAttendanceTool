import Link from "next/link";
import { CalendarCheck, CalendarDays, ListChecks, FileText, Megaphone } from "lucide-react";
import type { HistoryEntryType } from "@/types/employee";
import styles from "./DashboardFeed.module.css";

const HISTORY_ICON: Record<HistoryEntryType, { Icon: typeof CalendarCheck; cls: string }> = {
  attendance: { Icon: CalendarCheck, cls: "icon-attendance" },
  leave: { Icon: CalendarDays, cls: "icon-leave" },
  task: { Icon: ListChecks, cls: "icon-task" },
  policy: { Icon: FileText, cls: "icon-policy" },
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { day: "2-digit", month: "short" });
}

// A dashboard-only view-model that merges two real domains (this employee's
// activity history and the announcements addressed to them) into one
// chronological list, mirroring the reference dashboard's "My Feed" - built
// in page.tsx, not a new backend entity.
export type FeedItem =
  | { kind: "history"; id: string; date: string; title: string; meta?: string; type: HistoryEntryType }
  | { kind: "announcement"; id: string; date: string; title: string; meta?: string; isUnread: boolean; href: string };

interface DashboardFeedProps {
  items: FeedItem[];
}

export default function DashboardFeed({ items }: DashboardFeedProps) {
  if (items.length === 0) {
    return <span style={{ fontSize: 13, color: "var(--color-text-muted)" }}>Nothing to show yet.</span>;
  }

  return (
    <div className={styles.list}>
      {items.map((item) => {
        if (item.kind === "announcement") {
          return (
            <Link href={item.href} className={styles.item} key={`a-${item.id}`}>
              <span className={`${styles.icon} ${styles["icon-announcement"]}`}>
                <Megaphone size={15} strokeWidth={1.75} />
              </span>
              <div className={styles.body}>
                <div className={styles.topLine}>
                  <span className={styles.title}>{item.title}</span>
                  {item.isUnread && <span className={styles.unreadTag}>Unread</span>}
                </div>
                <span className={styles.meta}>
                  Announcement{item.meta ? ` · ${item.meta}` : ""} · {formatDate(item.date)}
                </span>
              </div>
            </Link>
          );
        }

        const { Icon, cls } = HISTORY_ICON[item.type];
        return (
          <div className={styles.item} key={`h-${item.id}`}>
            <span className={`${styles.icon} ${styles[cls]}`}>
              <Icon size={15} strokeWidth={1.75} />
            </span>
            <div className={styles.body}>
              <span className={styles.title}>{item.title}</span>
              <span className={styles.meta}>
                {item.meta ? `${item.meta} · ` : ""}
                {formatDate(item.date)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
