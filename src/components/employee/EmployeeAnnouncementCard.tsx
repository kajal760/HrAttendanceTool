import Link from "next/link";
import { Paperclip } from "lucide-react";
import type { Announcement } from "@/types/announcement";
import styles from "./EmployeeAnnouncementCard.module.css";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

interface EmployeeAnnouncementCardProps {
  announcement: Announcement;
  isUnread: boolean;
}

export default function EmployeeAnnouncementCard({ announcement, isUnread }: EmployeeAnnouncementCardProps) {
  return (
    <div className={`${styles.card} ${isUnread ? styles.unread : ""}`}>
      <div className={styles.topRow}>{isUnread && <span className={styles.newBadge}>New</span>}</div>

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
