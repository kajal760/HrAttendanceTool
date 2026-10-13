"use client";

import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import styles from "./DateRangeFilter.module.css";

interface DateRangeFilterProps {
  from: string;
  to: string;
}

// From/To date-range filter, writing ?from=&to= to the URL (preserving any
// other params already there, e.g. Attendance History's ?year=&month=) so
// the server re-filters the log on navigation - same URL-driven pattern as
// `CalendarMonthFilter`, just for an arbitrary range instead of one month.
export default function DateRangeFilter({ from, to }: DateRangeFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [draftFrom, setDraftFrom] = useState(from);
  const [draftTo, setDraftTo] = useState(to);

  const invalid = Boolean(draftFrom && draftTo && draftFrom > draftTo);

  function go(nextFrom: string, nextTo: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (nextFrom) params.set("from", nextFrom);
    else params.delete("from");
    if (nextTo) params.set("to", nextTo);
    else params.delete("to");
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  function clear() {
    setDraftFrom("");
    setDraftTo("");
    go("", "");
  }

  return (
    <div className={styles.filter}>
      <label className={styles.field}>
        From
        <input type="date" className={styles.input} value={draftFrom} onChange={(e) => setDraftFrom(e.target.value)} />
      </label>
      <label className={styles.field}>
        To
        <input type="date" className={styles.input} value={draftTo} onChange={(e) => setDraftTo(e.target.value)} />
      </label>
      <button type="button" className={styles.applyButton} disabled={invalid} onClick={() => go(draftFrom, draftTo)}>
        Apply
      </button>
      {(from || to) && (
        <button type="button" className={styles.clearButton} onClick={clear}>
          Clear
        </button>
      )}
      {invalid && <span className={styles.error}>From must be on or before To.</span>}
    </div>
  );
}
