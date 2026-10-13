import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { isWeekend, addDays, isoDay } from "@/lib/hr/attendance-history";

// Attendance correction requests raised by employees and decided by HR/managers.
// File-backed like the other stores; seeded once with a few recent requests.

export type CorrectionStatus = "Pending" | "Approved" | "Rejected";

export interface CorrectionRequest {
  id: string;
  employeeId: string;
  date: string; // YYYY-MM-DD
  requestedCheckIn?: string; // HH:MM
  requestedCheckOut?: string; // HH:MM
  reason: string;
  status: CorrectionStatus;
  submittedOn: string; // ISO
  decidedOn?: string; // ISO
}

const DATA_DIR = path.join(process.cwd(), ".data");
const INDEX_PATH = path.join(DATA_DIR, "attendance-corrections.json");

function seed(now: Date): CorrectionRequest[] {
  const recentWeekdays: string[] = [];
  for (let back = 1; recentWeekdays.length < 4 && back < 20; back++) {
    const d = addDays(now, -back);
    if (!isWeekend(d)) recentWeekdays.push(isoDay(d));
  }
  const [d1, d2, d3, d4] = recentWeekdays;
  const sub = (n: number) => addDays(now, -n).toISOString();
  const list: CorrectionRequest[] = [
    { id: "corr-1", employeeId: "emp-1032", date: d1, requestedCheckIn: "09:05", reason: "Badge reader was down, I was in by 9:05.", status: "Pending", submittedOn: sub(1) },
    { id: "corr-2", employeeId: "emp-1067", date: d2, requestedCheckIn: "09:10", requestedCheckOut: "18:15", reason: "Forgot to clock out; left at 6:15 PM.", status: "Pending", submittedOn: sub(1) },
    { id: "corr-3", employeeId: "emp-1078", date: d3, requestedCheckIn: "08:55", reason: "Clocked in from the office but the location check failed.", status: "Approved", submittedOn: sub(3), decidedOn: sub(2) },
    { id: "corr-4", employeeId: "emp-1091", date: d4, requestedCheckOut: "19:00", reason: "Stayed late for a production release.", status: "Rejected", submittedOn: sub(4), decidedOn: sub(3) },
  ];
  return list.filter((c) => c.date);
}

async function readIndex(): Promise<CorrectionRequest[]> {
  try {
    return JSON.parse(await readFile(INDEX_PATH, "utf8")) as CorrectionRequest[];
  } catch {
    const seeded = seed(new Date());
    await mkdir(DATA_DIR, { recursive: true });
    await writeFile(INDEX_PATH, JSON.stringify(seeded, null, 2), "utf8");
    return seeded;
  }
}

async function writeIndex(list: CorrectionRequest[]): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(INDEX_PATH, JSON.stringify(list, null, 2), "utf8");
}

export async function getCorrections(): Promise<CorrectionRequest[]> {
  return (await readIndex()).sort((a, b) => (a.submittedOn < b.submittedOn ? 1 : -1));
}

export async function decideCorrection(id: string, status: "Approved" | "Rejected"): Promise<CorrectionRequest | null | "already-decided"> {
  const list = await readIndex();
  const index = list.findIndex((c) => c.id === id);
  if (index === -1) return null;
  if (list[index].status !== "Pending") return "already-decided";
  list[index] = { ...list[index], status, decidedOn: new Date().toISOString() };
  await writeIndex(list);
  return list[index];
}
