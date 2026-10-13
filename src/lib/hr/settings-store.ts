import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

// A handful of app-wide HR settings that don't warrant their own store each
// - the Leave year start, and the Celebrations email toggles. Same
// disk-backed-JSON convention as `work-store.ts`/`leave-store.ts`.

const DATA_DIR = path.join(process.cwd(), ".data");
const SETTINGS_PATH = path.join(DATA_DIR, "settings.json");

export interface CelebrationSettings {
  birthdaysEnabled: boolean;
  anniversariesEnabled: boolean;
  sendTime: string; // "HH:MM", display-only - the actual cron/Task Scheduler time is set separately
}

export interface HrSettings {
  leaveYearStart: string; // "MM-DD", e.g. "07-01" for 1 July
  celebrations: CelebrationSettings;
}

const DEFAULT_SETTINGS: HrSettings = {
  leaveYearStart: "07-01",
  celebrations: {
    birthdaysEnabled: true,
    anniversariesEnabled: true,
    sendTime: "10:00",
  },
};

export async function getSettings(): Promise<HrSettings> {
  try {
    const raw = await readFile(SETTINGS_PATH, "utf8");
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<HrSettings>) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function patchSettings(patch: Partial<HrSettings>): Promise<HrSettings> {
  const current = await getSettings();
  const updated: HrSettings = {
    ...current,
    ...patch,
    celebrations: { ...current.celebrations, ...patch.celebrations },
  };
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(SETTINGS_PATH, JSON.stringify(updated, null, 2), "utf8");
  return updated;
}
