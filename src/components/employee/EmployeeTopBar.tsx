import { Bell } from "lucide-react";
import LogoutButton from "@/components/auth/LogoutButton";
import styles from "@/app/employee/layout.module.css";

interface EmployeeTopBarProps {
  name: string;
  initials: string;
  photoUrl?: string;
  unreadAnnouncementCount: number;
}

export default function EmployeeTopBar({
  name,
  initials,
  photoUrl,
  unreadAnnouncementCount,
}: EmployeeTopBarProps) {
  return (
    <header className={styles.topbar}>
      <div className={styles.brand}>
        <span className={styles.brandMark}>HR</span>
        <span>HR Attendance</span>
      </div>

      {/* Decorative period filter, matching the reference dashboard's "This
          Month" control - not wired to anything yet since none of the
          dashboard's data is broken down by period. */}
      <select className={styles.periodFilter} defaultValue="month" aria-label="Period filter">
        <option value="week">This Week</option>
        <option value="month">This Month</option>
        <option value="quarter">This Quarter</option>
      </select>

      <div className={styles.topbarRight}>
        <span className={styles.bellButton} title={`${unreadAnnouncementCount} unread announcements`}>
          <Bell size={19} strokeWidth={1.75} />
          {unreadAnnouncementCount > 0 && <span className={styles.bellDot} />}
        </span>
        <span className={styles.avatar} title={name}>
          {photoUrl ? <img src={photoUrl} alt="" className={styles.avatarImg} /> : initials}
        </span>
        <LogoutButton className={styles.logoutButton} />
      </div>
    </header>
  );
}
