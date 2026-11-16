import { backend } from "@/lib/api/backend";
import type { ApiOrgSettings } from "@/lib/api/types";

// Backed by the FastAPI `/settings` endpoint (a single row, created on first
// read).

export interface CelebrationSettings {
  birthdaysEnabled: boolean;
  anniversariesEnabled: boolean;
  sendTime: string; // "HH:MM", display-only - the actual cron/Task Scheduler time is set separately
}

export interface HrSettings {
  leaveYearStart: string; // "MM-DD", e.g. "07-01" for 1 July
  celebrations: CelebrationSettings;
}

function toSettings(s: ApiOrgSettings): HrSettings {
  return {
    leaveYearStart: s.leaveYearStart,
    celebrations: {
      birthdaysEnabled: s.celebrations.birthdaysEnabled,
      anniversariesEnabled: s.celebrations.anniversariesEnabled,
      sendTime: s.celebrations.sendTime,
    },
  };
}

export async function getSettings(): Promise<HrSettings> {
  return toSettings(await backend<ApiOrgSettings>("/settings"));
}

export async function patchSettings(patch: Partial<HrSettings>): Promise<HrSettings> {
  return toSettings(await backend<ApiOrgSettings>("/settings", { method: "PATCH", body: patch }));
}
