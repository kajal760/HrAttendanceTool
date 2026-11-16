import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

// The backend only stores whether a clock-in's location was captured
// (`locationCaptured: boolean`) - not the actual coordinates or a
// human-readable place name. Until that round-trips through the backend,
// keep the reverse-geocoded label here, in a JSON side file keyed by
// "employeeId:date", the same stopgap pattern as employee-extras-store.ts.

export interface AttendanceLocation {
  lat: number;
  lng: number;
  label: string; // reverse-geocoded address, or "lat, lng" if that lookup failed
}

const DATA_DIR = path.join(process.cwd(), ".data");
const LOCATIONS_PATH = path.join(DATA_DIR, "attendance-locations.json");

function key(employeeId: string, date: string): string {
  return `${employeeId}:${date}`;
}

async function getAll(): Promise<Record<string, AttendanceLocation>> {
  try {
    return JSON.parse(await readFile(LOCATIONS_PATH, "utf8")) as Record<string, AttendanceLocation>;
  } catch {
    return {};
  }
}

export async function getAttendanceLocation(employeeId: string, date: string): Promise<AttendanceLocation | null> {
  return (await getAll())[key(employeeId, date)] ?? null;
}

// Batch lookup for table views (daily/range) - one file read instead of one per row.
export async function getAttendanceLocations(employeeIds: string[], date: string): Promise<Map<string, AttendanceLocation>> {
  const all = await getAll();
  const map = new Map<string, AttendanceLocation>();
  for (const employeeId of employeeIds) {
    const loc = all[key(employeeId, date)];
    if (loc) map.set(employeeId, loc);
  }
  return map;
}

export async function saveAttendanceLocation(employeeId: string, date: string, location: AttendanceLocation): Promise<void> {
  const all = await getAll();
  all[key(employeeId, date)] = location;
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(LOCATIONS_PATH, JSON.stringify(all, null, 2), "utf8");
}

// Reverse-geocodes via OpenStreetMap's free Nominatim API (no key needed) -
// falls back to raw coordinates if the lookup fails or times out, so a
// clock-in never fails just because reverse geocoding did.
export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16&addressdetails=0`;
    const res = await fetch(url, {
      headers: { "User-Agent": "HumSetu-HR-Attendance/1.0" },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) throw new Error("reverse geocode failed");
    const data = (await res.json()) as { display_name?: string };
    return data.display_name ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  } catch {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }
}
