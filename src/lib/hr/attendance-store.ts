import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

// Clock-in/out for the signed-in manager/admin. File-backed like the other
// stores; one record per user per day. Dates use the server's local day.

export interface ClockRecord {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  clockIn?: string; // ISO
  clockOut?: string; // ISO
}

const DATA_DIR = path.join(process.cwd(), ".data");
const INDEX_PATH = path.join(DATA_DIR, "clock-records.json");

export function today(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

async function readIndex(): Promise<ClockRecord[]> {
  try {
    return JSON.parse(await readFile(INDEX_PATH, "utf8")) as ClockRecord[];
  } catch {
    return [];
  }
}

async function writeIndex(list: ClockRecord[]): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(INDEX_PATH, JSON.stringify(list, null, 2), "utf8");
}

export async function getTodayRecord(userId: string): Promise<ClockRecord | null> {
  const list = await readIndex();
  return list.find((r) => r.userId === userId && r.date === today()) ?? null;
}

// Most recent clock-in/out days for this user, newest first - backs the
// "View history" panel on the admin/HR dashboard's own attendance card.
export async function getRecordHistory(userId: string, limit = 14): Promise<ClockRecord[]> {
  const list = await readIndex();
  return list
    .filter((r) => r.userId === userId)
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, limit);
}

export type ClockResult = { record: ClockRecord } | { error: string };

export async function clockIn(userId: string): Promise<ClockResult> {
  const list = await readIndex();
  const existing = list.find((r) => r.userId === userId && r.date === today());
  if (existing?.clockIn) return { error: "You have already clocked in today." };
  const now = new Date().toISOString();
  if (existing) {
    existing.clockIn = now;
    await writeIndex(list);
    return { record: existing };
  }
  const record: ClockRecord = { id: `clk-${Date.now()}`, userId, date: today(), clockIn: now };
  await writeIndex([record, ...list]);
  return { record };
}

export async function clockOut(userId: string): Promise<ClockResult> {
  const list = await readIndex();
  const existing = list.find((r) => r.userId === userId && r.date === today());
  if (!existing?.clockIn) return { error: "Clock in before clocking out." };
  if (existing.clockOut) return { error: "You have already clocked out today." };
  existing.clockOut = new Date().toISOString();
  await writeIndex(list);
  return { record: existing };
}
