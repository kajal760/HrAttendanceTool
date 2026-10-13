"use client";

import Link from "next/link";
import { Eye, CheckCircle2, Paperclip } from "lucide-react";
import type { Announcement } from "@/types/announcement";
import type { EmployeeOverview } from "@/types/hr";
import { announcementStatus, audienceLabel, resolveAudience } from "@/lib/announcements/status";
import { withBase } from "@/lib/portal";
import { usePortalBase } from "./usePortalBase";
import styles from "./AnnouncementCard.module.css";

const PRIORITY_DOT: Record<Announcement["priority"], string> = {
  Normal: "dot-normal",
  Important: "dot-important",
  Urgent: "dot-urgent",
};

const STATUS_CLASS: Record<string, string> = {
  Draft: "status-draft",
  Scheduled: "status-scheduled",
  Published: "status-published",
  Expired: "status-expired",
  Archived: "status-archived",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

interface AnnouncementCardProps {
  announcement: Announcement;
  employees: EmployeeOverview[];
}

export default function AnnouncementCard({ announcement, employees }: AnnouncementCardProps) {
  const base = usePortalBase();
  const status = announcementStatus(announcement);
  const recipients = resolveAudience(announcement.audience, employees);

  return (
    <div className={styles.card}>
      <div className={styles.topRow}>
        <span className={`${styles.priorityBadge} ${styles[PRIORITY_DOT[announcement.priority]]}`}>
          <span className={styles.dot} />
          {announcement.priority.toUpperCase()}
        </span>
        <span className={styles.typeBadge}>{announcement.type}</span>
        <span className={`${styles.statusBadge} ${styles[STATUS_CLASS[status]]}`}>{status}</span>
      </div>

      <h3 className={styles.title}>{announcement.title}</h3>
      <p className={styles.excerpt}>{announcement.content}</p>

      <div className={styles.metaBlock}>
        <span>
          Created by: <strong>{announcement.createdByName}</strong> ({announcement.createdByRole})
        </span>
        <span>Audience: {audienceLabel(announcement.audience, employees)}</span>
        <span>
          {status === "Scheduled" ? "Scheduled for" : status === "Draft" ? "Not yet published" : "Published"}
          {status !== "Draft" ? `: ${formatDate(announcement.publishAt)}` : ""}
        </span>
        {announcement.attachments.length > 0 && (
          <span className={styles.attachmentLine}>
            <Paperclip size={12} /> {announcement.attachments.length} attachment(s)
          </span>
        )}
      </div>

      {status !== "Draft" && (
        <div className={styles.statsRow}>
          <span className={styles.stat}>
            <Eye size={14} /> {announcement.reads.length} / {recipients.length} read
          </span>
          {announcement.requireAcknowledgement && (
            <span className={styles.stat}>
              <CheckCircle2 size={14} /> {announcement.acknowledgements.length} acknowledged
            </span>
          )}
        </div>
      )}

      <Link href={withBase(base, `/announcements/${announcement.id}`)} className={styles.viewLink}>
        View Announcement →
      </Link>
    </div>
  );
}
