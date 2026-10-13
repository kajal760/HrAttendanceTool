import Link from "next/link";
import { Megaphone } from "lucide-react";
import type { Announcement } from "@/types/announcement";
import styles from "./DashboardNoticeBanner.module.css";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { day: "2-digit", month: "2-digit", year: "numeric" });
}

interface DashboardNoticeBannerProps {
  announcement: Announcement;
}

// The reference dashboard's pill-shaped reminder bar (icon + message +
// right-aligned "date · By: poster") - backed by the single highest-priority
// unread announcement, rather than a fabricated static notice.
export default function DashboardNoticeBanner({ announcement }: DashboardNoticeBannerProps) {
  return (
    <Link href={`/employee/announcements/${announcement.id}`} className={styles.banner}>
      <span className={styles.icon}>
        <Megaphone size={13} strokeWidth={2} />
      </span>
      <span className={styles.message}>{announcement.title} - {announcement.content}</span>
      <span className={styles.meta}>
        {formatDate(announcement.publishAt)} &middot; By: {announcement.createdByName}
      </span>
    </Link>
  );
}
