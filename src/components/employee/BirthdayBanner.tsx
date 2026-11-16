import type { DirectoryPerson } from "@/types/employee";
import styles from "./BirthdayBanner.module.css";

function joinNames(names: string[]): string {
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
}

interface BirthdayBannerProps {
  birthdays: DirectoryPerson[];
}

// Visible app-wide birthday callout. Pairs with the automated email sent by
// `src/lib/employee/birthday-mailer.ts` at 10:00 AM on the same day, and
// with BirthdayConfetti (shown only to the birthday person themselves) -
// `birthdays` is fetched once in the layout and shared by both.
export default function BirthdayBanner({ birthdays }: BirthdayBannerProps) {
  if (birthdays.length === 0) return null;

  const names = joinNames(birthdays.map((b) => b.name));

  return (
    <div className={styles.banner}>
      <span className={styles.icon} aria-hidden="true">
        🎉
      </span>
      <span>
        Happy Birthday, <span className={styles.names}>{names}</span>! Wish them well
        today.
      </span>
    </div>
  );
}
