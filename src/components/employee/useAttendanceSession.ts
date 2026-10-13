"use client";

import { useEffect, useState } from "react";
import type { BreakSession, TodaySession } from "@/types/employee";

const STORAGE_KEY = "hr-attendance:today-session:v1";

function todayKey(): string {
  // en-CA formats as YYYY-MM-DD in the local timezone.
  return new Date().toLocaleDateString("en-CA");
}

const EMPTY_SESSION: TodaySession = {
  status: "idle",
  workMode: "Office",
  breaks: [],
};

function loadSession(): TodaySession {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_SESSION;
    const parsed = JSON.parse(raw) as TodaySession & { date: string };
    if (parsed.date !== todayKey()) return EMPTY_SESSION;
    return parsed;
  } catch {
    return EMPTY_SESSION;
  }
}

function saveSession(session: TodaySession) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...session, date: todayKey() }));
  } catch {
    // localStorage unavailable - the in-memory state still holds for this tab.
  }
}

function totalBreakMs(breaks: BreakSession[], now: number): number {
  return breaks.reduce((sum, b) => {
    const end = b.endedAt ? new Date(b.endedAt).getTime() : now;
    return sum + Math.max(0, end - new Date(b.startedAt).getTime());
  }, 0);
}

// Shared "today's clock-in session" state - same localStorage-backed session
// read/written by both the full tracker (Attendance > Today) and the
// dashboard's compact hours card, so clocking in on one is reflected on the
// other. TODO: replace the geolocation capture + localStorage persistence
// with a real `POST /api/attendance/clock-in` (and /break, /clock-out) once
// the backend exists.
export function useAttendanceSession() {
  const [session, setSession] = useState<TodaySession>(EMPTY_SESSION);
  const [now, setNow] = useState(() => Date.now());
  const [geoError, setGeoError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    setSession(loadSession());
  }, []);

  useEffect(() => {
    if (session.status !== "clocked-in" && session.status !== "on-break") return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [session.status]);

  function update(next: TodaySession) {
    setSession(next);
    saveSession(next);
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
        update({
          status: "clocked-in",
          workMode: session.workMode,
          clockInAt: new Date().toISOString(),
          location: { lat: position.coords.latitude, lng: position.coords.longitude },
          breaks: [],
        });
      },
      () => {
        setLocating(false);
        setGeoError("Couldn't get your location. Check permissions and retry.");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  function handleStartBreak() {
    const breakSession: BreakSession = { id: `brk-${Date.now()}`, startedAt: new Date().toISOString() };
    update({ ...session, status: "on-break", breaks: [...session.breaks, breakSession] });
  }

  function handleEndBreak() {
    const breaks = session.breaks.map((b, i) =>
      i === session.breaks.length - 1 && !b.endedAt ? { ...b, endedAt: new Date().toISOString() } : b,
    );
    update({ ...session, status: "clocked-in", breaks });
  }

  function handleClockOut() {
    update({ ...session, status: "clocked-out", clockOutAt: new Date().toISOString() });
  }

  const clockInMs = session.clockInAt ? new Date(session.clockInAt).getTime() : null;
  const clockOutMs = session.clockOutAt ? new Date(session.clockOutAt).getTime() : null;
  const elapsedMs = clockInMs ? (clockOutMs ?? now) - clockInMs : 0;
  const breakMs = totalBreakMs(session.breaks, now);
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
