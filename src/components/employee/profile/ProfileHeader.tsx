"use client";

import { useState } from "react";
import Link from "next/link";
import { Camera } from "lucide-react";
import type { EmployeeOverview } from "@/types/hr";
import { STATUS_CLASS } from "@/lib/employee/profile-format";
import styles from "./Profile.module.css";

interface ProfileHeaderProps {
  employee: EmployeeOverview;
  managerName?: string;
}

// Shared across all three Profile tabs: avatar (+ photo-change alert), name,
// status badge, and subline. Each tab owns its own "Edit" action for the
// fields it can actually change (Personal details, Contact) - this header
// used to also link to `/superadmin/employees/:id` as an "Edit profile
// (HR/Manager)" shortcut, but that route is HR/Admin-only and bounced a
// signed-in employee straight to the login page, so it's gone.
export default function ProfileHeader({ employee, managerName }: ProfileHeaderProps) {
  const [showPhotoAlert, setShowPhotoAlert] = useState(false);

  return (
    <div className={styles.header}>
      <span className={styles.avatarWrap}>
        <span className={styles.avatar}>
          {employee.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={employee.photoUrl} alt="" className={styles.avatarImg} />
          ) : (
            employee.initials
          )}
        </span>
        <button
          type="button"
          className={styles.avatarEditBadge}
          onClick={() => setShowPhotoAlert(true)}
          aria-label="Change profile photo"
          title="Change profile photo"
        >
          <Camera size={12} strokeWidth={2} />
        </button>
      </span>
      <div className={styles.headerBody}>
        <div className={styles.nameRow}>
          <h2 className={styles.name}>{employee.name}</h2>
          <span className={`${styles.badge} ${styles[STATUS_CLASS[employee.status]]}`}>{employee.status}</span>
        </div>
        <span className={styles.subline}>
          {employee.designation} &middot; {employee.department}
          {managerName ? ` · Reports to ${managerName}` : ""}
        </span>
      </div>

      {showPhotoAlert && (
        <div className={styles.alertOverlay} onClick={() => setShowPhotoAlert(false)}>
          <div className={styles.alertBox} onClick={(e) => e.stopPropagation()}>
            <span className={styles.alertIcon}>
              <Camera size={20} strokeWidth={1.75} />
            </span>
            <h3 className={styles.alertTitle}>Profile photo</h3>
            <p className={styles.alertText}>
              Profile photos are verified and updated by HR, not self-service. Please connect with
              HR to change yours.
            </p>
            <div className={styles.alertActions}>
              <button type="button" className={styles.alertButtonMuted} onClick={() => setShowPhotoAlert(false)}>
                Close
              </button>
              <Link href="/employee/requests" className={styles.alertButton} onClick={() => setShowPhotoAlert(false)}>
                Contact HR
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
