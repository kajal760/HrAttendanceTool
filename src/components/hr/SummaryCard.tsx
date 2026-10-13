import { Users, CalendarCheck, Inbox, CheckSquare, Briefcase, UserPlus, type LucideIcon } from "lucide-react";
import type { HrSummaryCard } from "@/types/hr";
import styles from "./SummaryCard.module.css";

const ICONS: Record<HrSummaryCard["icon"], LucideIcon> = {
  employees: Users,
  attendance: CalendarCheck,
  requests: Inbox,
  tasks: CheckSquare,
  projects: Briefcase,
  onboarding: UserPlus,
};

export default function SummaryCard({ label, value, meta, icon }: HrSummaryCard) {
  const Icon = ICONS[icon];
  return (
    <div className={styles.card}>
      <span className={styles.iconWrap}>
        <Icon size={20} strokeWidth={2} />
      </span>
      <div className={styles.body}>
        <span className={styles.label}>{label}</span>
        <span className={styles.value}>{value}</span>
        {meta && <span className={styles.meta}>{meta}</span>}
      </div>
    </div>
  );
}
