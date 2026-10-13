import type { Metadata } from "next";
import { getUpcomingBirthdays } from "@/lib/employee/mock-data";
import BirthdayList from "@/components/employee/BirthdayList";

export const metadata: Metadata = {
  title: "Birthdays | HR Attendance",
};

export const dynamic = "force-dynamic";

export default async function CelebrationsBirthdaysPage() {
  const birthdays = await getUpcomingBirthdays(50, 365);

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 4px" }}>Birthdays</h1>
        <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: 0 }}>
          Upcoming birthdays across the company - an email goes out automatically at 10:00 AM on the day,
          CC'ing everyone else.
        </p>
      </div>
      <BirthdayList items={birthdays} />
    </>
  );
}
