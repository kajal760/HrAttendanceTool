"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import type { ClockRecord } from "@/lib/hr/attendance-store";
import styles from "./ManagerClockCard.module.css";

function formatWorked(ms: number): string {
  const mins = Math.max(0, Math.floor(ms / 60000));
  return `${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, "0")}m`;
}

interface ManagerClockCardProps {
  initial: ClockRecord | null;
}

export default function ManagerClockCard({ initial }: ManagerClockCardProps) {
  const [record, setRecord] = useState<ClockRecord | null>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  // Times depend on the viewer's timezone, so they're only rendered after mount.
  useEffect(() => {
    setMounted(true);
    const id = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(id);
  }, []);

  async function act(action: "clock-in" | "clock-out") {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/superadmin/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not record that.");
        return;
      }
      setRecord(data.record);
    } catch {
      setError("Could not reach the server - try again.");
    } finally {
      setBusy(false);
    }
  }

  const clockedIn = !!record?.clockIn;
  const clockedOut = !!record?.clockOut;
  const time = (iso?: string) =>
    mounted && iso ? new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "";

  let status = "Not clocked in today";
  if (clockedIn && !clockedOut) status = `Clocked in at ${time(record?.clockIn)}`;
  if (clockedOut) status = `Clocked out at ${time(record?.clockOut)}`;
  const worked =
    mounted && record?.clockIn
      ? formatWorked((record.clockOut ? new Date(record.clockOut).getTime() : now) - new Date(record.clockIn).getTime())
      : null;

  return (
    <div className={styles.card}>
      <span className={styles.iconWrap}>
        <Clock size={18} strokeWidth={2} />
      </span>
      <div className={styles.body}>
        <span className={styles.label}>Attendance today</span>
        <span className={styles.status}>{status}</span>
        {worked && <span className={styles.meta}>Worked {worked}</span>}
        {error && <span className={styles.error}>{error}</span>}
      </div>
      <div className={styles.actions}>
        <button type="button" className={styles.clockIn} onClick={() => act("clock-in")} disabled={busy || clockedIn}>
          Clock in
        </button>
        <button type="button" className={styles.clockOut} onClick={() => act("clock-out")} disabled={busy || !clockedIn || clockedOut}>
          Clock out
        </button>
      </div>
    </div>
  );
}
