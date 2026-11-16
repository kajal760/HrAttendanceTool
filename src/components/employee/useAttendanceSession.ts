"use client";

import { useEffect, useState } from "react";
import type { BreakSession, GeoPoint, TodaySession } from "@/types/employee";
import type { ClockRecord } from "@/lib/hr/attendance-store";

const EMPTY_SESSION: TodaySession = {
  status: "idle",
  workMode: "Office",
  breaks: [],
};

function toSession(record: ClockRecord | null, workMode: TodaySession["workMode"]): TodaySession {
  if (!record?.clockIn) return { ...EMPTY_SESSION, workMode };
  const breaks: BreakSession[] = record.breaks ?? [];
  const onBreak = breaks.some((b) => !b.endedAt);
  return {
    status: record.clockOut ? "clocked-out" : onBreak ? "on-break" : "clocked-in",
    workMode: record.workMode,
    clockInAt: record.clockIn,
    clockOutAt: record.clockOut,
    breaks,
  };
}

function totalBreakMs(breaks: BreakSession[], now: number): number {
  return breaks.reduce((sum, b) => {
    const end = b.endedAt ? new Date(b.endedAt).getTime() : now;
    return sum + Math.max(0, end - new Date(b.startedAt).getTime());
  }, 0);
}

// Shared "today's clock-in session" state for the full tracker (Attendance >
// Today) and the dashboard's compact hours card. The record lives on the
// backend (`/api/employee/attendance`), so clocking in on one page - or on
// another device - shows up everywhere. Clock-in still asks the browser for
// a location, which is stored with the record.
export function useAttendanceSession() {
  const [session, setSession] = useState<TodaySession>(EMPTY_SESSION);
  const [now, setNow] = useState(() => Date.now());
  const [geoError, setGeoError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/employee/attendance")
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data: { record: ClockRecord | null }) => {
        if (!cancelled) setSession((prev) => toSession(data.record, prev.workMode));
      })
      .catch(() => {
        if (!cancelled) setGeoError("Couldn't load today's attendance. Refresh to try again.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (session.status !== "clocked-in" && session.status !== "on-break") return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [session.status]);

  async function send(action: string, extra?: Record<string, unknown>) {
    setGeoError(null);
    try {
      const res = await fetch("/api/employee/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      const data = await res.json();
      if (!res.ok) {
        setGeoError(data.error ?? "That didn't work - try again.");
        return;
      }
      setSession(toSession(data.record, session.workMode));
      setNow(Date.now());
    } catch {
      setGeoError("Couldn't reach the server - check your connection and try again.");
    }
  }

  function setWorkMode(workMode: TodaySession["workMode"]) {
    setSession((prev) => ({ ...prev, workMode }));
  }

  function handleClockIn() {
    if (!("geolocation" in navigator)) {
      setGeoError("Location isn't available in this browser.");
      return;
    }
    setGeoError(null);
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        const location: GeoPoint = { lat: position.coords.latitude, lng: position.coords.longitude };
        void send("clock-in", { workMode: session.workMode, location });
      },
      () => {
        setLocating(false);
        setGeoError("Couldn't get your location. Check permissions and retry.");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  function handleStartBreak() {
    void send("break-start");
  }

  function handleEndBreak() {
    void send("break-end");
  }

  function handleClockOut() {
    void send("clock-out");
  }

  const clockInMs = session.clockInAt ? new Date(session.clockInAt).getTime() : null;
  const clockOutMs = session.clockOutAt ? new Date(session.clockOutAt).getTime() : null;
  const elapsedMs = clockInMs ? (clockOutMs ?? now) - clockInMs : 0;
  const breakMs = totalBreakMs(session.breaks, clockOutMs ?? now);
  const netMs = Math.max(0, elapsedMs - breakMs);

  return {
    session,
    geoError,
    locating,
    netMs,
    breakMs,
    setWorkMode,
    handleClockIn,
    handleStartBreak,
    handleEndBreak,
    handleClockOut,
  };
}
