import { Bell } from "lucide-react";
import LogoutButton from "@/components/auth/LogoutButton";
import GlobalSearch from "@/components/hr/GlobalSearch";
import type { PortalBase } from "@/lib/portal";
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
  base: PortalBase;
}

// `base` isn't used here - kept in the prop list so callers don't need to
// change when passing it, in case the avatar grows a destination again.
export default function HrTopBar({ pendingRequestCount, userName }: HrTopBarProps) {
  return (
    <header className={styles.topbar}>
      <div className={styles.brand}>
        <span className={styles.brandMark}>HS</span>
        <span>HumSetu</span>
      </div>

      <GlobalSearch />

      <div className={styles.topbarRight}>
        <span className={styles.bellButton} title={`${pendingRequestCount} pending requests`}>
          <Bell size={19} strokeWidth={1.75} />
          {pendingRequestCount > 0 && <span className={styles.bellDot} />}
        </span>
        {/* No self-service account page - sign-in is OTP-based, so there's
            nothing to change here; the avatar is just an identity marker. */}
        <span className={styles.avatar} title={userName}>
          {initialsFor(userName)}
        </span>
        <LogoutButton className={styles.logoutButton} />
      </div>
    </header>
  );
}
