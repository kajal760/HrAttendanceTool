"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, CheckCircle2, Paperclip, Pencil } from "lucide-react";
import type { Announcement } from "@/types/announcement";
import type { EmployeeOverview } from "@/types/hr";
import { announcementStatus, audienceLabel, resolveAudience } from "@/lib/announcements/status";
import { withBase } from "@/lib/portal";
import { usePortalBase } from "./usePortalBase";
import styles from "./AnnouncementDetail.module.css";

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

interface AnnouncementDetailProps {
  announcement: Announcement;
  employees: EmployeeOverview[];
}

export default function AnnouncementDetail({ announcement: initial, employees }: AnnouncementDetailProps) {
  const router = useRouter();
  const base = usePortalBase();
  const [announcement, setAnnouncement] = useState(initial);
  const [busy, setBusy] = useState(false);

  const status = announcementStatus(announcement);
  const recipients = resolveAudience(announcement.audience, employees);
  const readPct = recipients.length === 0 ? 0 : Math.round((announcement.reads.length / recipients.length) * 100);
  const ackPct = recipients.length === 0 ? 0 : Math.round((announcement.acknowledgements.length / recipients.length) * 100);

  async function transition(lifecycle: "Live" | "Archived", publishNow?: boolean) {
    setBusy(true);
    try {
      const body: Record<string, unknown> = { lifecycle };
      if (publishNow) body.publishAt = new Date().toISOString();
      const res = await fetch(`/api/superadmin/announcements/${announcement.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) setAnnouncement(data.announcement);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div>
          <span className={styles.statusBadge}>{status}</span>
          <h1 className={styles.title}>{announcement.title}</h1>
          <div className={styles.metaLine}>
            Created by <strong>{announcement.createdByName}</strong> ({announcement.createdByRole}) &middot; Audience:{" "}
            {audienceLabel(announcement.audience, employees)}
          </div>
        </div>
        <div className={styles.actions}>
          {(status === "Draft" || status === "Scheduled") && (
            <button type="button" className={styles.primaryButton} disabled={busy} onClick={() => transition("Live", true)}>
              Publish now
            </button>
          )}
          {(status === "Published" || status === "Scheduled" || status === "Expired") && (
            <button type="button" className={styles.secondaryButton} disabled={busy} onClick={() => transition("Archived")}>
              Archive
            </button>
          )}
          {status === "Archived" && (
            <button type="button" className={styles.secondaryButton} disabled={busy} onClick={() => transition("Live", true)}>
              Unarchive &amp; republish
            </button>
          )}
          <Link href={withBase(base, `/announcements/${announcement.id}/edit`)} className={styles.editLink}>
            <Pencil size={13} /> Edit
          </Link>
        </div>
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

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Recipients</span>
          <span className={styles.statValue}>{recipients.length}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>
            <Eye size={13} /> Read
          </span>
          <span className={styles.statValue}>
            {announcement.reads.length} ({readPct}%)
          </span>
        </div>
        {announcement.requireAcknowledgement && (
          <div className={styles.statCard}>
            <span className={styles.statLabel}>
              <CheckCircle2 size={13} /> Acknowledged
            </span>
            <span className={styles.statValue}>
              {announcement.acknowledgements.length} ({ackPct}%)
            </span>
          </div>
        )}
        {announcement.expiresAt && (
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Expires</span>
            <span className={styles.statValue}>{formatDateTime(announcement.expiresAt)}</span>
          </div>
        )}
      </div>

      <div className={styles.historySection}>
        <h2 className={styles.sectionTitle}>History</h2>
        <ul className={styles.historyList}>
          {announcement.history.map((h) => (
            <li key={h.id} className={styles.historyItem}>
              <span className={styles.historyTime}>{formatDateTime(h.timestamp)}</span>
              <span>
                {h.performedBy} — {h.type}
                {h.detail ? `: ${h.detail}` : ""}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <button type="button" className={styles.backButton} onClick={() => router.push(withBase(base, "/announcements"))}>
        ← Back to announcements
      </button>
    </div>
  );
}
