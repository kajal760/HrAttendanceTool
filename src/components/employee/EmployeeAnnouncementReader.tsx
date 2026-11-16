"use client";

import { useEffect } from "react";
import { Paperclip } from "lucide-react";
import type { Announcement } from "@/types/announcement";
import styles from "./EmployeeAnnouncementReader.module.css";

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

interface EmployeeAnnouncementReaderProps {
  announcement: Announcement;
  employeeId: string;
}

// Records a read receipt as soon as this mounts (the employee actually
// opened the announcement).
export default function EmployeeAnnouncementReader({ announcement, employeeId }: EmployeeAnnouncementReaderProps) {
  useEffect(() => {
    fetch(`/api/announcements/${announcement.id}/read`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employeeId }),
    }).catch(() => {
      // Best-effort - not being able to record a read receipt shouldn't block reading.
    });
    // Only on mount for this announcement/employee pair.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [announcement.id, employeeId]);

  return (
    <div className={styles.wrap}>
      <div className={styles.topRow}>
        <span className={styles.typeBadge}>{announcement.type}</span>
        <span className={styles.priorityBadge}>{announcement.priority}</span>
      </div>
      <h1 className={styles.title}>{announcement.title}</h1>
      <div className={styles.metaLine}>
        By {announcement.createdByName} ({announcement.createdByRole}) &middot; Published {formatDateTime(announcement.publishAt)}
      </div>

      <div className={styles.contentCard}>
        <p className={styles.content}>{announcement.content}</p>

        {announcement.attachments.length > 0 && (
          <div className={styles.attachments}>
            {announcement.attachments.map((att) => (
              <a key={att.id} href={att.url} target="_blank" rel="noreferrer" className={styles.attachmentLink}>
                <Paperclip size={13} /> {att.name}
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
