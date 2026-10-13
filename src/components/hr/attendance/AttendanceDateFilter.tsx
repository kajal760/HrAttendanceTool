"use client";

import { useRouter, usePathname } from "next/navigation";
import styles from "../lifecycle/Lifecycle.module.css";

// Sets the `?date=` the Attendance pages read on the server. Changing it
// re-renders the page with that day's records.
export default function AttendanceDateFilter({ value }: { value: string }) {
  const router = useRouter();
  const pathname = usePathname();
  return (
    <label className={styles.hint} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      Date
      <input
        type="date"
        className={styles.filterSelect}
        value={value}
        onChange={(e) => {
          if (e.target.value) router.replace(`${pathname}?date=${e.target.value}`, { scroll: false });
        }}
      />
    </label>
  );
}
