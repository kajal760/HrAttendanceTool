"use client";

import { useState } from "react";
import { TriangleAlert } from "lucide-react";
import styles from "./LeaveLimitAlert.module.css";

interface LeaveLimitAlertProps {
  percentUsed: number;
  totalRemaining: number;
  threshold: number;
}

// Pops up on the employee's own Leave Balance page once `percentUsed`
// crosses `threshold` (80%, see LEAVE_WARNING_THRESHOLD) - a plain card on
// the page is easy to miss, this makes sure the warning is actually seen.
export default function LeaveLimitAlert({ percentUsed, totalRemaining, threshold }: LeaveLimitAlertProps) {
  const [dismissed, setDismissed] = useState(false);
  if (percentUsed < threshold || dismissed) return null;

  return (
    <div className={styles.overlay} onMouseDown={(e) => e.target === e.currentTarget && setDismissed(true)}>
      <div className={styles.panel} role="alertdialog" aria-modal="true" aria-label="Leave balance running low">
        <h3 className={styles.title}>
          <TriangleAlert size={18} strokeWidth={2} />
          Leave balance running low
        </h3>
        <p className={styles.message}>
          You&apos;ve used {percentUsed}% of your annual leave allocation - only {totalRemaining}{" "}
          {totalRemaining === 1 ? "day" : "days"} left. Plan any remaining time off accordingly.
        </p>
        <div className={styles.actions}>
          <button type="button" className={styles.dismissButton} onClick={() => setDismissed(true)}>
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
