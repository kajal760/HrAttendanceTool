"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import Link from "next/link";
import type { Announcement, AnnouncementCreatorRole, AnnouncementPriority, AnnouncementType } from "@/types/announcement";
import { ANNOUNCEMENT_CREATOR_ROLES, ANNOUNCEMENT_PRIORITIES, ANNOUNCEMENT_TYPES } from "@/types/announcement";
import type { EmployeeOverview } from "@/types/hr";
import { withBase } from "@/lib/portal";
import { usePortalBase } from "./usePortalBase";
import AnnouncementCard from "./AnnouncementCard";
import styles from "./AnnouncementList.module.css";

interface AnnouncementListProps {
  announcements: Announcement[];
  employees: EmployeeOverview[];
}

// The horizontal Published/Scheduled/Drafts/Archived split lives in the
// secondary navbar (one route, `?status=`, see nav-config.ts) - Creator/
// Type/Priority stay as in-page filters here instead, per how this section
// was scoped: tabs for the one axis worth a permanent route, filters for
// everything else.
export default function AnnouncementList({ announcements, employees }: AnnouncementListProps) {
  const base = usePortalBase();
  const [creatorFilter, setCreatorFilter] = useState<AnnouncementCreatorRole | "All">("All");
  const [typeFilter, setTypeFilter] = useState<AnnouncementType | "All">("All");
  const [priorityFilter, setPriorityFilter] = useState<AnnouncementPriority | "All">("All");

  const filtered = useMemo(() => {
    return announcements.filter((a) => {
      if (creatorFilter !== "All" && a.createdByRole !== creatorFilter) return false;
      if (typeFilter !== "All" && a.type !== typeFilter) return false;
      if (priorityFilter !== "All" && a.priority !== priorityFilter) return false;
      return true;
    });
  }, [announcements, creatorFilter, typeFilter, priorityFilter]);

  return (
    <div>
      <div className={styles.toolbar}>
        <div className={styles.filters}>
          <select value={creatorFilter} onChange={(e) => setCreatorFilter(e.target.value as AnnouncementCreatorRole | "All")} aria-label="Filter by creator">
            <option value="All">All creators</option>
            {ANNOUNCEMENT_CREATOR_ROLES.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as AnnouncementType | "All")} aria-label="Filter by type">
            <option value="All">All types</option>
            {ANNOUNCEMENT_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value as AnnouncementPriority | "All")} aria-label="Filter by priority">
            <option value="All">All priorities</option>
            {ANNOUNCEMENT_PRIORITIES.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
        <Link href={withBase(base, "/announcements/new")} className={styles.addButton}>
          <Plus size={14} strokeWidth={2.25} />
          Create Announcement
        </Link>
      </div>

      <div className={styles.grid}>
        {filtered.length === 0 && <p className={styles.empty}>No announcements in this view.</p>}
        {filtered.map((a) => (
          <AnnouncementCard key={a.id} announcement={a} employees={employees} />
        ))}
      </div>
    </div>
  );
}
