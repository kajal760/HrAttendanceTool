import Link from "next/link";
import { Paperclip } from "lucide-react";
import type { Announcement } from "@/types/announcement";
import styles from "./EmployeeAnnouncementCard.module.css";

const PRIORITY_CLASS: Record<Announcement["priority"], string> = {
  Normal: "dot-normal",
  Important: "dot-important",
  Urgent: "dot-urgent",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

interface EmployeeAnnouncementCardProps {
  announcement: Announcement;
  isUnread: boolean;
  needsAcknowledgement: boolean;
}

export default function EmployeeAnnouncementCard({ announcement, isUnread, needsAcknowledgement }: EmployeeAnnouncementCardProps) {
  return (
    <div className={`${styles.card} ${isUnread ? styles.unread : ""}`}>
      <div className={styles.topRow}>
        <span className={`${styles.priorityBadge} ${styles[PRIORITY_CLASS[announcement.priority]]}`}>
          <span className={styles.dot} />
          {announcement.priority.toUpperCase()}
        </span>
        <span className={styles.typeBadge}>{announcement.type}</span>
        {isUnread && <span className={styles.newBadge}>New</span>}
        {needsAcknowledgement && <span className={styles.ackBadge}>Acknowledgement required</span>}
      </div>

      <h3 className={styles.title}>{announcement.title}</h3>
      <p className={styles.excerpt}>{announcement.content}</p>

      <div className={styles.metaLine}>
        By {announcement.createdByName} ({announcement.createdByRole}) &middot; {formatDate(announcement.publishAt)}
        {announcement.attachments.length > 0 && (
          <>
            {" "}
            &middot; <Paperclip size={11} style={{ verticalAlign: "middle" }} /> {announcement.attachments.length}
          </>
        )}
      </div>

      <Link href={`/employee/announcements/${announcement.id}`} className={styles.viewLink}>
        Read Announcement →
      </Link>
    </div>
  );
}
