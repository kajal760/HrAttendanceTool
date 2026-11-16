"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import styles from "./AnnouncementCreatorFilter.module.css";

interface AnnouncementCreatorFilterProps {
  postedBy: string;
}

// Filters the list by who posted it (`createdByRole`), writing ?postedBy= to
// the URL - same URL-driven pattern as `DateRangeFilter`. Just All/HR for
// now, not every creator role - HR is the one employees actually want to
// isolate (official notices vs. everything else).
export default function AnnouncementCreatorFilter({ postedBy }: AnnouncementCreatorFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function go(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set("postedBy", value);
    else params.delete("postedBy");
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <label className={styles.field}>
      Posted by
      <select className={styles.select} value={postedBy} onChange={(e) => go(e.target.value)}>
        <option value="">All</option>
        <option value="HR">HR</option>
      </select>
    </label>
  );
}
