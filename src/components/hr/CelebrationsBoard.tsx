"use client";

import { useMemo, useState } from "react";
import { Send } from "lucide-react";
import type { CelebrationEntry, CelebrationKind } from "@/lib/hr/celebrations";
import styles from "./CelebrationsBoard.module.css";

const FILTERS: { key: CelebrationKind | "All"; label: string }[] = [
  { key: "All", label: "All" },
  { key: "Birthday", label: "Birthdays" },
  { key: "Work Anniversary", label: "Work Anniversaries" },
  { key: "New Joiner", label: "New Joiners" },
];

const KIND_EMOJI: Record<CelebrationKind, string> = {
  Birthday: "🎂",
  "Work Anniversary": "💼",
  "New Joiner": "👋",
};

const KIND_BADGE_CLASS: Record<CelebrationKind, string> = {
  Birthday: "badge-birthday",
  "Work Anniversary": "badge-anniversary",
  "New Joiner": "badge-newjoiner",
};

const KIND_PHOTO_BG: Record<CelebrationKind, string> = {
  Birthday: "var(--color-info-bg)",
  "Work Anniversary": "var(--color-hr-accent-bg)",
  "New Joiner": "var(--color-success-bg)",
};

function initialsOf(name: string): string {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

function greetingSubject(entry: CelebrationEntry): string {
  if (entry.kind === "Birthday") return "Happy Birthday!";
  if (entry.kind === "Work Anniversary") return `Happy ${entry.detail ?? ""} Work Anniversary!`;
  return "Welcome to the team!";
}

interface CelebrationsBoardProps {
  entries: CelebrationEntry[];
}

// Birthdays, work anniversaries, and new joiners in one filterable card
// board - "Send greetings" opens a pre-filled email to the person (there's
// no in-app messaging/greeting-send endpoint, so this uses a real `mailto:`
// instead of a button that would quietly do nothing).
export default function CelebrationsBoard({ entries }: CelebrationsBoardProps) {
  const [filter, setFilter] = useState<CelebrationKind | "All">("All");

  const counts = useMemo(() => {
    const c: Record<CelebrationKind, number> = { Birthday: 0, "Work Anniversary": 0, "New Joiner": 0 };
    for (const e of entries) c[e.kind]++;
    return c;
  }, [entries]);

  const filtered = filter === "All" ? entries : entries.filter((e) => e.kind === filter);

  return (
    <>
      <div className={styles.chipRow}>
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            className={`${styles.chip} ${filter === f.key ? styles.chipActive : ""}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
            {f.key !== "All" && ` (${counts[f.key]})`}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className={styles.empty}>Nothing in this view for the next couple of months.</div>
      ) : (
        <div className={styles.grid}>
          {filtered.map((entry) => (
            <div className={styles.card} key={entry.id}>
              <div className={styles.photo} style={{ background: KIND_PHOTO_BG[entry.kind] }}>
                {entry.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={entry.photoUrl} alt={entry.name} className={styles.photoImg} />
                ) : (
                  <span className={styles.photoInitials}>{initialsOf(entry.name)}</span>
                )}
              </div>
              <div className={styles.body}>
                <span className={styles.emoji}>{KIND_EMOJI[entry.kind]}</span>
                <span className={`${styles.badge} ${styles[KIND_BADGE_CLASS[entry.kind]]}`}>
                  {entry.dateLabel} · {entry.kind === "Work Anniversary" ? entry.detail : entry.kind}
                </span>
                <span className={styles.name}>{entry.name}</span>
                <span className={styles.designation}>{entry.designation}</span>
                <a
                  className={styles.greetButton}
                  href={`mailto:${entry.email}?subject=${encodeURIComponent(greetingSubject(entry))}`}
                >
                  <Send size={12} /> Send greetings
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
