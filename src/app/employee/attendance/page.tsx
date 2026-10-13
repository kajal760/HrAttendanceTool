import type { Metadata } from "next";
import SectionCard from "@/components/employee/SectionCard";
import AttendanceTracker from "@/components/employee/AttendanceTracker";

export const metadata: Metadata = {
  title: "Today's Attendance | HR Attendance",
};

export default function EmployeeAttendanceTodayPage() {
  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 4px" }}>Today</h1>
        <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: 0 }}>
          Clock in, choose Office or Work From Home, and track breaks through the day.
        </p>
      </div>

      <SectionCard title="Today" subtitle="Clock in, start/end a break, and clock out">
        <AttendanceTracker />
      </SectionCard>
    </>
  );
}
