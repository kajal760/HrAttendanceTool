import Link from "next/link";
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
        <span className={styles.brandMark}>HS</span>
        <span>HumSetu</span>
      </div>

      <div className={styles.topbarRight}>
        <span className={styles.bellButton} title={`${unreadAnnouncementCount} unread announcements`}>
          <Bell size={19} strokeWidth={1.75} />
          {unreadAnnouncementCount > 0 && <span className={styles.bellDot} />}
        </span>
        <Link href="/employee/profile" className={styles.avatar} title={name}>
          {photoUrl ? <img src={photoUrl} alt="" className={styles.avatarImg} /> : initials}
        </Link>
        <LogoutButton className={styles.logoutButton} />
      </div>
    </header>
  );
}
