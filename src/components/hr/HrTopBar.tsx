import { Bell } from "lucide-react";
import LogoutButton from "@/components/auth/LogoutButton";
import GlobalSearch from "@/components/hr/GlobalSearch";
import styles from "@/app/superadmin/layout.module.css";

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

interface HrTopBarProps {
  pendingRequestCount: number;
  userName: string;
}

export default function HrTopBar({ pendingRequestCount, userName }: HrTopBarProps) {
  return (
    <header className={styles.topbar}>
      <div className={styles.brand}>
        <span className={styles.brandMark}>HR</span>
        <span>HR Attendance</span>
      </div>

      <GlobalSearch />

      <div className={styles.topbarRight}>
        <span className={styles.bellButton} title={`${pendingRequestCount} pending requests`}>
          <Bell size={19} strokeWidth={1.75} />
          {pendingRequestCount > 0 && <span className={styles.bellDot} />}
        </span>
        <span className={styles.avatar} title={userName}>
          {initialsFor(userName)}
        </span>
        <LogoutButton className={styles.logoutButton} />
      </div>
    </header>
  );
}
