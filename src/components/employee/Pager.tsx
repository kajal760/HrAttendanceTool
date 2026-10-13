"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import styles from "./Pager.module.css";

interface PagerProps {
  page: number; // 0-indexed
  totalPages: number;
  onChange: (page: number) => void;
}

// Compact "N of M" + back/forward control, bottom-right - same convention
// used for the Clock ins/outs history pager.
export default function Pager({ page, totalPages, onChange }: PagerProps) {
  if (totalPages <= 1) return null;

  return (
    <div className={styles.pager}>
      <span className={styles.pagerLabel}>
        {page + 1} of {totalPages}
      </span>
      <button
        type="button"
        className={styles.pagerButton}
        onClick={() => onChange(Math.max(0, page - 1))}
        disabled={page === 0}
        aria-label="Previous page"
      >
        <ChevronLeft size={15} strokeWidth={2} />
      </button>
      <button
        type="button"
        className={styles.pagerButton}
        onClick={() => onChange(Math.min(totalPages - 1, page + 1))}
        disabled={page === totalPages - 1}
        aria-label="Next page"
      >
        <ChevronRight size={15} strokeWidth={2} />
      </button>
    </div>
  );
}
