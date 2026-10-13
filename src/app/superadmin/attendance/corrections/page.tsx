import type { Metadata } from "next";
import { getCorrections } from "@/lib/hr/attendance-corrections";
import { getDailyRecords } from "@/lib/hr/attendance-daily";
import { getEmployeeOverviews } from "@/lib/hr/employee-store";
import CorrectionsTable, { type CorrectionRow } from "@/components/hr/attendance/CorrectionsTable";

export const metadata: Metadata = {
  title: "Attendance Corrections | HR Attendance",
};

export const dynamic = "force-dynamic";

function fmtRequested(c: { requestedCheckIn?: string; requestedCheckOut?: string }): string {
  const parts: string[] = [];
  if (c.requestedCheckIn) parts.push(`Check-in ${c.requestedCheckIn}`);
  if (c.requestedCheckOut) parts.push(`Check-out ${c.requestedCheckOut}`);
  return parts.join(" · ") || "-";
}

export default async function AttendanceCorrectionsPage() {
  const [corrections, employees] = await Promise.all([getCorrections(), getEmployeeOverviews()]);
  const byId = new Map(employees.map((e) => [e.id, e]));

  // The record each request is correcting, looked up for its own date.
  const dates = Array.from(new Set(corrections.map((c) => c.date)));
  const recordsByDate = new Map(await Promise.all(dates.map(async (d) => [d, await getDailyRecords(d)] as const)));

  const rows: CorrectionRow[] = corrections.map((c) => {
    const emp = byId.get(c.employeeId);
    const current = recordsByDate.get(c.date)?.find((r) => r.employeeId === c.employeeId);
    const currentText = current
      ? `${current.status}${current.checkIn ? ` · in ${current.checkIn}` : ""}${current.checkOut ? ` · out ${current.checkOut}` : ""}`
      : "No record";
    return {
      id: c.id,
      employeeName: emp?.name ?? c.employeeId,
      employeeCode: emp?.employeeCode ?? "-",
      department: emp?.department ?? "-",
      date: c.date,
      requested: fmtRequested(c),
      reason: c.reason,
      current: currentText,
      status: c.status,
      submittedOn: c.submittedOn,
    };
  });

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 4px" }}>Attendance Corrections</h1>
        <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: 0 }}>
          Missed or wrong clock entries employees have asked to fix. Approve or reject each request.
        </p>
      </div>
      <CorrectionsTable initialRows={rows} />
    </>
  );
}
