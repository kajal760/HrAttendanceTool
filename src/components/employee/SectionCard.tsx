import type { ReactNode } from "react";
import styles from "./SectionCard.module.css";

interface SectionCardProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}

export default function SectionCard({
  title,
  subtitle,
  action,
  children,
}: SectionCardProps) {
  return (
    <section className={styles.card}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>{title}</h2>
          {subtitle ? <div className={styles.subtitle}>{subtitle}</div> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
