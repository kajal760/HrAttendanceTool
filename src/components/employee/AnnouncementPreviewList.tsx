import Link from "next/link";
import type { Announcement } from "@/types/announcement";
import styles from "./AnnouncementPreviewList.module.css";

const DOT_CLASS: Record<Announcement["priority"], string> = {
  Normal: "dot-normal",
  Important: "dot-important",
  Urgent: "dot-urgent",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { day: "2-digit", month: "short" });
}

export interface AnnouncementPreviewItem {
  announcement: Announcement;
  isUnread: boolean;
}

interface AnnouncementPreviewListProps {
  items: AnnouncementPreviewItem[];
}

// Compact shortcut list for the dashboard - the full card (priority badge,
// excerpt, acknowledgement state) lives on /employee/announcements via
// EmployeeAnnouncementCard. This just gets someone to the right notice fast.
export default function AnnouncementPreviewList({ items }: AnnouncementPreviewListProps) {
  if (items.length === 0) {
    return <span style={{ fontSize: 13, color: "var(--color-text-muted)" }}>No announcements right now.</span>;
  }

  return (
    <div className={styles.list}>
      {items.map(({ announcement, isUnread }) => (
        <Link
          href={`/employee/announcements/${announcement.id}`}
          className={styles.item}
          key={announcement.id}
        >
          <span className={`${styles.dot} ${styles[DOT_CLASS[announcement.priority]]}`} />
          <div className={styles.body}>
            <span className={styles.title}>{announcement.title}</span>
            <span className={styles.meta}>
              {announcement.type} &middot; {formatDate(announcement.publishAt)}
            </span>
          </div>
          {isUnread && <span className={styles.newTag}>New</span>}
        </Link>
      ))}
    </div>
  );
}
