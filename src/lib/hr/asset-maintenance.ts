import type { Asset } from "@/types/asset";

// There's no dedicated "maintenance record" entity on the backend - this
// derives one from each asset's own event history, pairing every "Sent for
// repair" with the "Repaired" event that follows it (if any). An asset
// still `Under repair` with no later "Repaired" event is an open record.

export interface MaintenanceRecord {
  id: string; // the "Sent for repair" event's id - unique per repair cycle
  assetId: string;
  assetTag: string;
  assetName: string;
  status: "In Progress" | "Completed";
  sentOn: string; // ISO
  completedOn?: string; // ISO
  sentBy: string;
  completedBy?: string;
  detail?: string;
}

export function buildMaintenanceRecords(assets: Asset[]): MaintenanceRecord[] {
  const records: MaintenanceRecord[] = [];

  for (const asset of assets) {
    const history = asset.history;
    for (let i = 0; i < history.length; i++) {
      const sent = history[i];
      if (sent.type !== "Sent for repair") continue;

      const repaired = history.slice(i + 1).find((e) => e.type === "Repaired");
      records.push({
        id: sent.id,
        assetId: asset.id,
        assetTag: asset.assetTag,
        assetName: asset.name,
        status: repaired ? "Completed" : "In Progress",
        sentOn: sent.date,
        completedOn: repaired?.date,
        sentBy: sent.performedBy,
        completedBy: repaired?.performedBy,
        detail: sent.detail,
      });
    }
  }

  return records.sort((a, b) => (a.sentOn < b.sentOn ? 1 : -1));
}
